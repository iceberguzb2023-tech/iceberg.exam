import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role") || "STUDENT"
    const level = searchParams.get("level") || "ALL"
    const search = searchParams.get("search") || ""
    const date = searchParams.get("date") || ""
    const testId = searchParams.get("testId") || "ALL"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get("limit") || "50")))
    const exportAll = searchParams.get("export") === "true"

    const where: any = { role }

    if (level !== "ALL") where.level = level
    if (testId !== "ALL") where.testId = testId
    if (date) {
      const dateStart = new Date(date)
      const dateEnd = new Date(date)
      dateEnd.setDate(dateEnd.getDate() + 1)
      where.createdAt = { gte: dateStart, lt: dateEnd }
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ]
    }

    const select = {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      level: true,
      score: true,
      totalQuestions: true,
      maxPossibleScore: true,
      createdAt: true,
      testId: true,
      test: { select: { title: true } },
    } as const

    if (exportAll) {
      const exportStart = Date.now()
      console.log(`[Export] Boshlash — role=${role}, level=${level}, search="${search}", date=${date}, testId=${testId}`)

      const submissions = await prisma.submission.findMany({
        where,
        select: {
          id: true, firstName: true, lastName: true, role: true, level: true,
          score: true, totalQuestions: true, maxPossibleScore: true,
          createdAt: true, testId: true, answers: true,
          test: { include: { questions: true } },
        },
        orderBy: { createdAt: "desc" },
      })

      console.log(`[Export] API tugadi — ${submissions.length} ta submission, ${Date.now() - exportStart}ms`)
      return NextResponse.json({ submissions, total: submissions.length })
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        select,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.submission.count({ where }),
    ])

    return NextResponse.json({ submissions, total, page, limit })
  } catch (error) {
    console.error("Admin submissions error:", error)
    return NextResponse.json({ error: "Ma'lumotlarni yuklashda xatolik" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Ruxsat berilmagan" }, { status: 401 })
  }

  try {
    const { ids } = await req.json()
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "ID-lar ro'yxati topilmadi" }, { status: 400 })
    }

    await prisma.submission.deleteMany({
      where: { id: { in: ids } },
    })

    return NextResponse.json({ message: "Tanlangan natijalar o'chirildi" })
  } catch (error) {
    console.error("Bulk delete error:", error)
    return NextResponse.json({ error: "Natijalarni o'chirishda xatolik" }, { status: 500 })
  }
}
