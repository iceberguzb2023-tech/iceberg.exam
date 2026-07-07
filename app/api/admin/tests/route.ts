import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })

  try {
    const tests = await prisma.test.findMany({
      include: { questions: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(tests)
  } catch (err) {
    return NextResponse.json({ error: "Xatolik" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })

  try {
    const body = await req.json()
    const { title, role, level, questions, timeLimit } = body

    const test = await prisma.test.create({
      data: {
        title,
        role: role as "STUDENT" | "TEACHER",
        level,
        timeLimit: timeLimit ? parseInt(timeLimit.toString()) : null,
        questions: {
          create: questions.map((q: any, i: number) => ({
            text: q.text,
            type: q.type as "MCQ" | "OPEN" | "VOCABULARY",
            images: q.images || [],
            options: q.options,
            correctAnswer: q.correctAnswer,
            vocabularyItems: q.vocabularyItems || [],
            audio: q.audio || null,
            order: i,
          })),
        },
      },
      include: { questions: true },
    })

    return NextResponse.json(test)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Yaratishda xatolik" }, { status: 500 })
  }
}
