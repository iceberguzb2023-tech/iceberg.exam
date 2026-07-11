import ExcelJS from 'exceljs'

function makeSheetName(sub: any, used: Set<string>): string {
  const name = `${sub.firstName?.trim() || ''} ${sub.lastName?.trim() || ''}`.trim()
  const test = sub.test?.title?.trim() || ''
  let candidate = `${name} - ${test}`
  if (candidate.length > 31) {
    const prefixLen = name.length + 3
    const maxTest = 31 - prefixLen
    candidate = maxTest > 0 ? `${name} - ${test.substring(0, maxTest)}` : name.substring(0, 31)
  }
  candidate = candidate.replace(/[[\]:*?\/\\]/g, '')
  if (candidate.length > 31) candidate = candidate.substring(0, 31)

  if (!used.has(candidate)) { used.add(candidate); return candidate }
  let i = 1
  while (true) {
    const suffix = `(${i})`
    const alt = candidate.substring(0, 31 - suffix.length) + suffix
    if (!used.has(alt)) { used.add(alt); return alt }
    i++
  }
}

function statusText(vr: any): string {
  if (vr.isCorrect === true) return "To'g'ri"
  if (vr.isMisspelled === true) return "Imlo xato"
  if (vr.isCorrect === false) return "Xato"
  return "-"
}

export async function exportSubmissionsToExcel(submissions: any[], role: string, level: string = "Barcha", selectedDate?: string) {
  const t0 = Date.now()
  console.log(`[Export] Excel yaratish — ${submissions.length} ta submission, role=${role}, level=${level}`)

  const workbook = new ExcelJS.Workbook()
  const summarySheet = workbook.addWorksheet('Xulosa')

  const colors = { primary: '4F46E5', headerBg: '0F172A', headerText: 'FFFFFF', border: 'E2E8F0' }

  // ── Summary columns ──
  summarySheet.columns = [
    { header: 'Test Nomi', key: 'testTitle', width: 30 },
    { header: 'Ism', key: 'firstName', width: 15 },
    { header: 'Familiya', key: 'lastName', width: 15 },
    { header: 'Rol', key: 'role', width: 12 },
    { header: 'Etap / Mutaxassislik', key: 'level', width: 22 },
    { header: 'Sana', key: 'date', width: 22 },
    { header: 'Ball / Max', key: 'score', width: 12 },
    { header: 'Foiz', key: 'percentage', width: 10 },
    { header: 'Batafsil', key: 'details', width: 14 },
  ]

  // ── Track sheet names for dedup ──
  const usedSheetNames = new Set<string>()

  submissions.forEach((sub) => {
    const sName = makeSheetName(sub, usedSheetNames)

    // ── Summary row ──
    const maxScore = sub.maxPossibleScore || sub.totalQuestions
    const pct = maxScore > 0 ? Math.round((sub.score / maxScore) * 100) : 0
    const rowIdx = summarySheet.addRow({
      testTitle: sub.test?.title || "Noma'lum",
      firstName: sub.firstName,
      lastName: sub.lastName,
      role: sub.role === 'STUDENT' ? 'Talaba' : "O'qituvchi",
      level: sub.level,
      date: new Date(sub.createdAt).toLocaleString('uz-UZ'),
      score: `${Number(sub.score).toFixed(1)} / ${maxScore}`,
      percentage: `${pct}%`,
      details: "Ko'rish",
    })
    const detailsCell = summarySheet.getCell(rowIdx.number, 9)
    detailsCell.value = { text: "Ko'rish", hyperlink: `#${sName}!A1` }
    detailsCell.font = { color: { argb: '2563EB' }, underline: true, bold: true }

    // ── Detail sheet ──
    const detail = workbook.addWorksheet(sName)

    // Header block
    const header = [
      ['ISMI', `${sub.firstName} ${sub.lastName}`],
      ['TEST', sub.test?.title || "Noma'lum"],
      ['SANA', new Date(sub.createdAt).toLocaleString('uz-UZ')],
      ['BALL', `${Number(sub.score).toFixed(2)} / ${maxScore} (${pct}%)`],
      ['', ''],
    ]
    header.forEach(([label, value]) => {
      const r = detail.addRow([label, value])
      r.getCell(1).font = { bold: true, color: { argb: colors.primary }, size: 11 }
      r.getCell(2).font = { size: 11 }
    })

    if (!Array.isArray(sub.answers) || sub.answers.length === 0) {
      detail.addRow([])
      detail.addRow(['Javoblar topilmadi'])
      return
    }

    const colW = (w: number) => ({ width: w })

    // ── MCQ section ──
    const mcqItems = sub.answers.filter((a: any) => a.isCorrect !== undefined && a.isCorrect !== null)
    if (mcqItems.length > 0) {
      detail.addRow([])
      const titleR = detail.addRow(['VARIANTLI SAVOLLAR'])
      titleR.getCell(1).font = { bold: true, size: 13, color: { argb: colors.primary } }

      detail.columns = [colW(6), colW(50), colW(20), colW(20), colW(12)]
      const hdr = detail.addRow(['#', 'Savol', "Talaba javobi", "To'g'ri javob", 'Holat'])
      hdr.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } }
        c.font = { color: { argb: colors.headerText }, bold: true, size: 10 }
        c.alignment = { vertical: 'middle', horizontal: 'center' }
      })

      mcqItems.forEach((ans: any, idx: number) => {
        const q = sub.test?.questions?.find((q: any) => q.id === ans.questionId)
        const r = detail.addRow([
          idx + 1,
          ans.questionText || q?.text || '-',
          ans.answer || '(Javob berilmagan)',
          ans.correctAnswer || q?.correctAnswer || '-',
          ans.isCorrect ? "To'g'ri" : 'Xato',
        ])
        const statusCell = r.getCell(5)
        if (ans.isCorrect) {
          statusCell.font = { color: { argb: '10B981' }, bold: true }
        } else {
          statusCell.font = { color: { argb: 'EF4444' }, bold: true }
        }
        r.getCell(2).alignment = { wrapText: true }
      })
    }

    // ── OPEN section ──
    const openItems = sub.answers.filter((a: any) => a.aiScore !== undefined && a.aiScore !== null)
    if (openItems.length > 0) {
      detail.addRow([])
      const titleR = detail.addRow(['OCHIQ SAVOLLAR'])
      titleR.getCell(1).font = { bold: true, size: 13, color: { argb: colors.primary } }

      detail.columns = [colW(6), colW(50), colW(30), colW(10), colW(50)]
      const hdr = detail.addRow(['#', 'Savol', "Talaba javobi", 'AI ball', "AI fikr"])
      hdr.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } }
        c.font = { color: { argb: colors.headerText }, bold: true, size: 10 }
        c.alignment = { vertical: 'middle', horizontal: 'center' }
      })

      openItems.forEach((ans: any, idx: number) => {
        const q = sub.test?.questions?.find((q: any) => q.id === ans.questionId)
        const r = detail.addRow([
          idx + 1,
          ans.questionText || q?.text || '-',
          ans.answer || '(Javob berilmagan)',
          ans.aiScore.toFixed(2),
          ans.aiFeedback || '-',
        ])
        r.getCell(2).alignment = { wrapText: true }
        r.getCell(3).alignment = { wrapText: true }
        r.getCell(5).alignment = { wrapText: true }
        r.getCell(4).font = {
          color: { argb: ans.aiScore >= 1.0 ? '10B981' : ans.aiScore >= 0.5 ? 'D97706' : 'EF4444' },
          bold: true,
        }
      })
    }

    // ── VOCAB section ──
    const vocabItems = sub.answers.filter((a: any) => Array.isArray(a.vocabularyResults))
    if (vocabItems.length > 0) {
      detail.addRow([])
      const titleR = detail.addRow(['VOCABULARY'])
      titleR.getCell(1).font = { bold: true, size: 13, color: { argb: colors.primary } }

      detail.columns = [colW(6), colW(25), colW(25), colW(25), colW(15), colW(40)]
      const hdr = detail.addRow(['#', "So'z", "To'g'ri tarjima", "Talaba javobi", 'Holat', 'AI fikr'])
      hdr.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } }
        c.font = { color: { argb: colors.headerText }, bold: true, size: 10 }
        c.alignment = { vertical: 'middle', horizontal: 'center' }
      })

      let vIdx = 0
      vocabItems.forEach((ans: any) => {
        ans.vocabularyResults.forEach((vr: any) => {
          vIdx++
          const r = detail.addRow([
            vIdx,
            vr.word || '-',
            vr.translation || '-',
            vr.answer || '(Javob berilmagan)',
            statusText(vr),
            vr.feedback || '-',
          ])
          const statusCell = r.getCell(5)
          if (vr.isCorrect === true) {
            statusCell.font = { color: { argb: '10B981' }, bold: true }
          } else if (vr.isMisspelled === true) {
            statusCell.font = { color: { argb: 'D97706' }, bold: true }
          } else if (vr.isCorrect === false) {
            statusCell.font = { color: { argb: 'EF4444' }, bold: true }
          }
          r.getCell(6).alignment = { wrapText: true }
        })
      })
    }
  })

  // ── Style summary header ──
  const sh = summarySheet.getRow(1)
  sh.height = 30
  sh.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } }
    c.font = { color: { argb: colors.headerText }, bold: true, size: 11 }
    c.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  // Style summary data + auto-filter
  summarySheet.eachRow((row, rn) => {
    if (rn > 1) {
      row.eachCell((cell, cn) => {
        cell.alignment = { vertical: 'top', horizontal: cn === 2 || cn === 8 ? 'left' : 'center', wrapText: true }
        if (cn === 8 && typeof cell.value === 'string' && cell.value.includes('%')) {
          const v = parseInt(cell.value)
          cell.font = { bold: true, color: { argb: v >= 80 ? '10B981' : v >= 50 ? 'D97706' : 'EF4444' } }
        }
      })
    }
  })
  summarySheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 9 } }

  // ── Export ──
  const t1 = Date.now()
  console.log(`[Export] Sheet yaratildi — ${workbook.worksheets.length} ta sheet, ${t1 - t0}ms`)

  const buffer = await workbook.xlsx.writeBuffer()
  const t2 = Date.now()
  console.log(`[Export] Buffer yozildi — ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB, ${t2 - t1}ms`)

  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const dateStr = selectedDate || new Date().toISOString().split('T')[0]
  const fileName = `ICE_Natijalar_${dateStr}.xlsx`
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)

  console.log(`[Export] Yuklandi — ${fileName}, jami ${Date.now() - t0}ms`)
}
