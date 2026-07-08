import OpenAI from "openai"

const keyExists = !!process.env.OPENAI_API_KEY
const keyLength = process.env.OPENAI_API_KEY?.length || 0
console.log(`[AI Init] OPENAI_API_KEY mavjud: ${keyExists}, uzunligi: ${keyLength}`)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

export async function evaluateOpenQuestions(
  questions: { q: string; modelAnswer: string; studentAnswer: string }[]
): Promise<{ score: number; feedback: string }[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[AI OPEN] XATO: OPENAI_API_KEY topilmadi!")
    return fallbackScores(questions.length)
  }

  if (questions.length === 0) return []

  console.log(`[AI OPEN] ${questions.length} ta savolni baholash boshlandi...`)

  try {
    const start = Date.now()
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a strict but fair exam grader. Grade each student answer against the model answer. " +
            "Return a JSON array of objects with 'score' (0.0 to 2.0, float) and 'feedback' (short explanation in Uzbek). " +
            "0.0 = empty answer (student wrote nothing). " +
            "0.2 = student wrote something but it is completely wrong. " +
            "0.3 to 2.0 = partially to fully correct. " +
            "Accept synonyms and minor spelling mistakes if the meaning is correct.",
        },
        {
          role: "user",
          content: JSON.stringify(questions),
        },
      ],
      response_format: { type: "json_object" },
    })
    const elapsed = Date.now() - start
    console.log(`[AI OPEN] Javob keldi: ${elapsed}ms, model: ${response.model}, status: ${response.usage?.total_tokens || "?"} tokens`)

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.error("[AI OPEN] XATO: content bo'sh!")
      return fallbackScores(questions.length)
    }

    const parsed = JSON.parse(content)
    const results = parsed.results || parsed.scores || parsed.grades || parsed

    if (Array.isArray(results) && results.length === questions.length) {
      console.log(`[AI OPEN] Muvaffaqiyatli: ${results.length} ta natija`)
      return results.map((r: any) => ({
        score: typeof r.score === "number" ? (r.score === 0 ? 0 : Math.max(0.2, Math.min(2.0, r.score))) : 0.2,
        feedback: r.feedback || "",
      }))
    }

    console.error(`[AI OPEN] XATO: natijalar formati noto'g'ri, results:`, typeof results, Array.isArray(results) ? `length=${results.length}` : "array emas")
    return fallbackScores(questions.length)
  } catch (error: any) {
    console.error("[AI OPEN] XATO baholashda:", error?.message || error, error?.status ? `status=${error.status}` : "", error?.code ? `code=${error.code}` : "")
    return fallbackScores(questions.length)
  }
}

function fallbackScores(count: number): { score: number; feedback: string }[] {
  return Array.from({ length: count }, () => ({
    score: 0,
    feedback: "Baholashda xatolik yuz berdi",
  }))
}

export async function evaluateVocabularyAnswers(
  items: { word: string; studentAnswer: string }[]
): Promise<{ isCorrect: boolean; isMisspelled: boolean; feedback: string }[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[AI VOCAB] XATO: OPENAI_API_KEY topilmadi!")
    return fallbackVocab(items.length)
  }

  if (items.length === 0) return []

  console.log(`[AI VOCAB] ${items.length} ta so'zni baholash boshlandi...`)

  try {
    const start = Date.now()
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a vocabulary grader. For each word, detect the language: if English → Uzbek answer expected, " +
            "if Uzbek → English answer expected. Accept synonyms. " +
            "Scoring: " +
            "1) Exact correct translation → isCorrect: true, isMisspelled: false. " +
            "2) Meaning is correct but 1-2 character errors (wrong/missing/extra letter) → isCorrect: false, isMisspelled: true. " +
            "3) 3+ character errors or completely wrong meaning → isCorrect: false, isMisspelled: false. " +
            "Examples: target='friendship', answer='frendship' → misspelled (1 error). " +
            "target='friendship', answer='frendshp' → misspelled (2 errors). " +
            "target='friendship', answer='frendshippp' → wrong (3+ errors). " +
            "Return a JSON object with 'results' array where " +
            "each item has 'isCorrect' (boolean), 'isMisspelled' (boolean), and 'feedback' (short explanation in Uzbek).",
        },
        {
          role: "user",
          content: JSON.stringify(items),
        },
      ],
      response_format: { type: "json_object" },
    })
    const elapsed = Date.now() - start
    console.log(`[AI VOCAB] Javob keldi: ${elapsed}ms, model: ${response.model}, tokens: ${response.usage?.total_tokens || "?"}`)

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.error("[AI VOCAB] XATO: content bo'sh!")
      return fallbackVocab(items.length)
    }

    const parsed = JSON.parse(content)
    const results = parsed.results || parsed

    if (Array.isArray(results)) {
      console.log(`[AI VOCAB] Muvaffaqiyatli: ${results.length} ta natija (kutilgan: ${items.length})`)
      return items.map((_, i) => {
        const r = results[i]
        return r ? {
          isCorrect: typeof r.isCorrect === "boolean" ? r.isCorrect : false,
          isMisspelled: typeof r.isMisspelled === "boolean" ? r.isMisspelled : false,
          feedback: r.feedback || "",
        } : {
          isCorrect: false,
          isMisspelled: false,
          feedback: "Baholanmadi",
        }
      })
    }

    console.error(`[AI VOCAB] XATO: natijalar formati noto'g'ri, results:`, typeof results, Array.isArray(results) ? `length=${results.length}` : "array emas")
    return fallbackVocab(items.length)
  } catch (error: any) {
    console.error("[AI VOCAB] XATO:", error?.message || error, error?.status ? `status=${error.status}` : "", error?.code ? `code=${error.code}` : "")
    return fallbackVocab(items.length)
  }
}

function fallbackVocab(count: number): { isCorrect: boolean; isMisspelled: boolean; feedback: string }[] {
  console.log(`[AI VOCAB] Fallback: ${count} ta so'z 0 ball`)
  return Array.from({ length: count }, () => ({
    isCorrect: false,
    isMisspelled: false,
    feedback: "Baholashda xatolik yuz berdi",
  }))
}
