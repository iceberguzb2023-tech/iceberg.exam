import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { evaluateOpenQuestions, evaluateVocabularyAnswers } from "@/lib/ai"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { testId, firstName, lastName, role, level, answers } = body

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { questions: { orderBy: { order: "asc" } } },
    })

    if (!test) {
      return NextResponse.json({ error: "Test topilmadi" }, { status: 404 })
    }

    const openQuestionsForAI: { q: string; modelAnswer: string; studentAnswer: string; questionId: string; originalIdx: number }[] = []
    const vocabForAI: { word: string; studentAnswer: string; qIdx: number; itemIdx: number }[] = []
    let score = 0
    let totalQuestions = 0
    const processedAnswers: any[] = []

    test.questions.forEach((q) => {
      const userAnswer = answers.find((a: any) => a.questionId === q.id)?.answer

      if (q.type === "MCQ") {
        const isCorrect = userAnswer === q.correctAnswer
        if (isCorrect) score++
        totalQuestions++
        processedAnswers.push({
          questionId: q.id,
          questionText: q.text,
          correctAnswer: q.correctAnswer,
          answer: userAnswer,
          isCorrect,
        })
      } else if (q.type === "OPEN") {
        totalQuestions++
        processedAnswers.push({
          questionId: q.id,
          questionText: q.text,
          correctAnswer: q.correctAnswer,
          answer: userAnswer || "",
          isCorrect: null,
          aiScore: 0,
          aiFeedback: "",
        })
        openQuestionsForAI.push({
          q: q.text,
          modelAnswer: q.correctAnswer || "",
          studentAnswer: userAnswer || "",
          questionId: q.id,
          originalIdx: processedAnswers.length - 1,
        })
      } else if (q.type === "VOCABULARY") {
        const items: { word: string; translation: string }[] = (q.vocabularyItems as any) || []
        const userVocabAnswers: { word: string; answer: string }[] = userAnswer
          ? (typeof userAnswer === "string" ? JSON.parse(userAnswer) : userAnswer)
          : []

        const qIdx = processedAnswers.length
        const vocabResults = items.map((item, itemIdx) => {
          const matched = userVocabAnswers.find((ua) => ua.word === item.word)
          const studentAns = matched?.answer || ""
          totalQuestions++

          vocabForAI.push({
            word: item.word,
            studentAnswer: studentAns,
            qIdx,
            itemIdx,
          })

          return {
            word: item.word,
            translation: item.translation || "",
            answer: studentAns,
            isCorrect: false,
            isMisspelled: false,
            feedback: "",
          }
        })

        processedAnswers.push({
          questionId: q.id,
          questionText: q.text,
          correctAnswer: null,
          answer: userVocabAnswers,
          isCorrect: null,
          vocabularyResults: vocabResults,
        })
      }
    })

    // Batch AI grading for OPEN questions
    console.log(`[Submission] OPEN savollar: ${openQuestionsForAI.length} ta, VOCAB savollar: ${vocabForAI.length} ta`)
    console.log(`[Submission] OPENAI_API_KEY mavjud: ${!!process.env.OPENAI_API_KEY}, uzunligi: ${process.env.OPENAI_API_KEY?.length || 0}`)

    if (openQuestionsForAI.length > 0) {
      const start = Date.now()
      const aiResults = await evaluateOpenQuestions(
        openQuestionsForAI.map((oq) => ({
          q: oq.q,
          modelAnswer: oq.modelAnswer,
          studentAnswer: oq.studentAnswer,
        }))
      )
      console.log(`[Submission] OPEN AI natija: ${Date.now() - start}ms, natijalar: ${aiResults.length} ta`)

      aiResults.forEach((result, idx) => {
        const oq = openQuestionsForAI[idx]
        const ans = processedAnswers[oq.originalIdx]
        ans.aiScore = result.score
        ans.aiFeedback = result.feedback
        score += result.score
      })
    }

    // Batch AI grading for VOCABULARY
    if (vocabForAI.length > 0) {
      const start = Date.now()
      const aiVocabResults = await evaluateVocabularyAnswers(
        vocabForAI.map((v) => ({
          word: v.word,
          studentAnswer: v.studentAnswer,
        }))
      )
      console.log(`[Submission] VOCAB AI natija: ${Date.now() - start}ms, natijalar: ${aiVocabResults.length} ta`)

      aiVocabResults.forEach((result, idx) => {
        const v = vocabForAI[idx]
        const ans = processedAnswers[v.qIdx]
        if (ans.vocabularyResults && ans.vocabularyResults[v.itemIdx]) {
          const item = ans.vocabularyResults[v.itemIdx]
          item.isCorrect = result.isCorrect
          item.isMisspelled = result.isMisspelled
          item.feedback = result.feedback
          if (result.isCorrect) score += 1.0
          else if (result.isMisspelled) score += 0.5
        }
      })
    }

    score = Math.round(score * 100) / 100
    console.log(`[Submission] Tayyor: score=${score}, total=${totalQuestions}`)

    const submission = await prisma.submission.create({
      data: {
        testId,
        firstName,
        lastName,
        role: role.toUpperCase() as "STUDENT" | "TEACHER",
        level,
        answers: processedAnswers,
        score,
        totalQuestions,
      },
    })

    return NextResponse.json(submission)
  } catch (error) {
    console.error("Submission error:", error)
    return NextResponse.json({ error: "Natijani saqlashda xatolik" }, { status: 500 })
  }
}
