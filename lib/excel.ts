import ExcelJS from 'exceljs'

export async function exportSubmissionsToExcel(submissions: any[], role: string, level: string = "Barcha", selectedDate?: string) {
  const workbook = new ExcelJS.Workbook()
  
  // Sheet 1: Xulosa (Summary)
  const summarySheet = workbook.addWorksheet('Xulosa')
  // Sheet 2: Batafsil Natijalar (Details)
  const detailSheet = workbook.addWorksheet('Batafsil Javoblar')

  // Theme Colors
  const colors = {
    primary: '4F46E5',
    headerBg: '0F172A',
    headerText: 'FFFFFF',
    border: 'E2E8F0',
  }

  // --- 1. Summary Sheet Setup ---
  summarySheet.columns = [
    { header: 'Test Nomi', key: 'testTitle', width: 30 },
    { header: 'Ism', key: 'firstName', width: 15 },
    { header: 'Familiya', key: 'lastName', width: 15 },
    { header: 'Rol', key: 'role', width: 12 },
    { header: 'Etap / Mutaxassislik', key: 'level', width: 22 },
    { header: 'Sana', key: 'date', width: 22 },
    { header: 'Ball / Max', key: 'score', width: 12 },
    { header: 'Foiz', key: 'percentage', width: 10 },
  ]

  // --- 2. Detail Sheet Setup ---
  detailSheet.columns = [
    { header: 'O\'quvchi', key: 'student', width: 25 },
    { header: 'Sana', key: 'date', width: 22 },
    { header: 'Test', key: 'testTitle', width: 25 },
    { header: 'Savol #', key: 'qNum', width: 10 },
    { header: 'Savol Matni', key: 'qText', width: 60 },
    { header: 'O\'quvchi Javobi', key: 'userAnswer', width: 40 },
    { header: 'To\'g\'ri Javob', key: 'cAnswer', width: 30 },
    { header: 'Holat', key: 'status', width: 20 },
    { header: 'AI Ball', key: 'aiScore', width: 10 },
    { header: 'AI Fikr', key: 'aiFeedback', width: 40 },
  ]

  // --- 3. Fill Data ---
  submissions.forEach(sub => {
    const percentage = sub.totalQuestions > 0 ? Math.round((sub.score / sub.totalQuestions) * 100) : 0
    const studentName = `${sub.firstName} ${sub.lastName}`
    const submissionDate = new Date(sub.createdAt).toLocaleString('uz-UZ')
    const testTitle = sub.test?.title || "Noma'lum"

    // Add to Summary
    summarySheet.addRow({
      testTitle: testTitle,
      firstName: sub.firstName,
      lastName: sub.lastName,
      role: sub.role === 'STUDENT' ? 'Talaba' : 'O\'qituvchi',
      level: sub.level,
      date: submissionDate,
      score: `${Number(sub.score).toFixed(1)} / ${sub.totalQuestions}`,
      percentage: `${percentage}%`,
    })

    // Add to Details (One row per question / vocabulary item)
    if (Array.isArray(sub.answers)) {
      let rowCounter = 0
      sub.answers.forEach((ans: any, idx: number) => {
        const question = sub.test?.questions?.find((q: any) => q.id === ans.questionId)
        const qText = ans.questionText || question?.text || `Savol [ID: ${ans.questionId?.slice(-6)}]`

        // VOCABULARY: one row per vocabulary item
        if (ans.vocabularyResults && Array.isArray(ans.vocabularyResults)) {
          ans.vocabularyResults.forEach((vr: any) => {
            rowCounter++
            const status = vr.isCorrect === true ? "✅ To'g'ri" : vr.isCorrect === false ? "❌ Xato" : "-"
            detailSheet.addRow({
              student: studentName,
              date: submissionDate,
              testTitle: testTitle,
              qNum: rowCounter,
              qText: `${qText} - ${vr.word}`,
              userAnswer: vr.answer || "(Javob berilmagan)",
              cAnswer: vr.translation || "-",
              status: status,
              aiScore: "",
              aiFeedback: "",
            })
          })
        } else {
          rowCounter++
          const userAnswer = ans.answer !== undefined && ans.answer !== null ? ans.answer : "(Javob berilmagan)"
          const cAnswer = ans.correctAnswer || question?.correctAnswer || "-"
          const isCorrect = ans.isCorrect
          const aiScore = ans.aiScore !== undefined ? ans.aiScore : ""
          const aiFeedback = ans.aiFeedback || ""

          let status = ""
          if (isCorrect === true) status = "✅ To'g'ri"
          else if (isCorrect === false) status = "❌ Xato"
          else if (aiScore !== "") status = `AI: ${(aiScore * 100).toFixed(0)}%`
          else status = "📝 Ochiq savol"

          detailSheet.addRow({
            student: studentName,
            date: submissionDate,
            testTitle: testTitle,
            qNum: rowCounter,
            qText: qText,
            userAnswer: typeof userAnswer === 'object' ? JSON.stringify(userAnswer) : String(userAnswer),
            cAnswer: cAnswer,
            status: status,
            aiScore: aiScore !== "" ? aiScore.toFixed(2) : "",
            aiFeedback: aiFeedback,
          })
        }
      })
    }
  })

  // --- 4. Styling ---
  const styleSheet = (sheet: ExcelJS.Worksheet) => {
    // Header row
    const headerRow = sheet.getRow(1)
    headerRow.height = 30
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } }
      cell.font = { color: { argb: colors.headerText }, bold: true, size: 11 }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    // Data rows
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell, colNumber) => {
          // Align large text to left, others to center
          const isTextColumn = sheet === detailSheet && (colNumber === 5 || colNumber === 6 || colNumber === 10)
          cell.alignment = { 
            vertical: 'top', 
            horizontal: isTextColumn ? 'left' : 'center', 
            wrapText: true 
          }
          
          // Color percentage in Summary sheet
          if (sheet === summarySheet && colNumber === 8 && typeof cell.value === 'string' && cell.value.includes('%')) {
            const val = parseInt(cell.value)
            cell.font = { bold: true, color: { argb: val >= 80 ? '10B981' : val >= 50 ? 'F59E0B' : 'EF4444' } }
          }
        })
      }
    })
    
    // Add filtering
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length }
    }
  }

  styleSheet(summarySheet)
  styleSheet(detailSheet)

  // --- 5. Export ---
  const buffer = await workbook.xlsx.writeBuffer()
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
}
