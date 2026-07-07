import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })

  try {
    const { id } = await params
    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!test) return NextResponse.json({ error: "Test topilmadi" }, { status: 404 })
    return NextResponse.json(test)
  } catch (err) {
    return NextResponse.json({ error: "Yuklashda xatolik" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()
    const { title, role, level, questions, timeLimit } = body

    // 1. Get existing questions to determine deletes (read — no transaction needed)
    const existingQuestions = await prisma.question.findMany({
      where: { testId: id },
      select: { id: true }
    })
    const existingIds = existingQuestions.map(q => q.id)

    const incomingQuestionsWithId = questions.filter((q: any) => q.id && existingIds.includes(q.id))
    const incomingQuestionsWithoutId = questions.filter((q: any) => !q.id || !existingIds.includes(q.id))
    const incomingIds = incomingQuestionsWithId.map((q: any) => q.id)
    const idsToDelete = existingIds.filter(eid => !incomingIds.includes(eid))

    const allQuestionIds = questions.map((q: any) => q.id).filter(Boolean)
    const timeLimitValue = timeLimit ? parseInt(timeLimit.toString()) : null

    // 2. Batch transaction — all writes in one round-trip
    const batch: any[] = [
      prisma.test.update({
        where: { id },
        data: { title, role, level, timeLimit: timeLimitValue }
      })
    ]

    // Delete removed questions
    if (idsToDelete.length > 0) {
      batch.push(prisma.question.deleteMany({
        where: { id: { in: idsToDelete } }
      }))
    }

    // Update existing questions
    for (const q of incomingQuestionsWithId) {
      const orderIndex = allQuestionIds.indexOf(q.id)
      batch.push(prisma.question.update({
        where: { id: q.id },
        data: {
          text: q.text,
          type: q.type,
          images: q.images || [],
          options: q.options,
          correctAnswer: q.correctAnswer,
          vocabularyItems: q.vocabularyItems || [],
          audio: q.audio || null,
          order: orderIndex
        }
      }))
    }

    // Create new questions
    if (incomingQuestionsWithoutId.length > 0) {
      batch.push(prisma.question.createMany({
        data: incomingQuestionsWithoutId.map((q: any, i: number) => ({
          text: q.text,
          type: q.type,
          images: q.images || [],
          options: q.options,
          correctAnswer: q.correctAnswer,
          vocabularyItems: q.vocabularyItems || [],
          audio: q.audio || null,
          order: allQuestionIds.length + i,
          testId: id
        }))
      }))
    }

    await prisma.$transaction(batch)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Test update error:", err)
    return NextResponse.json({ error: "Yangilashda xatolik" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })

  try {
    const { id } = await params
    await prisma.test.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: "O'chirishda xatolik" }, { status: 500 })
  }
}
