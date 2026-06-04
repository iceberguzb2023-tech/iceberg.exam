import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const role = searchParams.get("role") as "STUDENT" | "TEACHER"
  const level = searchParams.get("level")

  try {
    const tests = await prisma.test.findMany({
      where: {
        role,
        level: level || undefined,
      },
      include: {
        questions: {
          orderBy: { order: "asc" }
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(tests)
  } catch (error) {
    return NextResponse.json({ error: "Testlarni yuklashda xatolik" }, { status: 500 })
  }
}
