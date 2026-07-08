import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

export async function evaluateOpenQuestions(
  questions: { q: string; modelAnswer: string; studentAnswer: string }[]
): Promise<{ score: number; feedback: string }[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY topilmadi")
    return fallbackScores(questions.length)
  }

  if (questions.length === 0) return []

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a strict but fair exam grader. Grade each student answer against the model answer. " +
            "Return a JSON array of objects with 'score' (0.2 to 2.0, float) and 'feedback' (short explanation in Uzbek). " +
            "0.2 = completely wrong, 2.0 = perfect answer. Accept synonyms and minor spelling mistakes if the meaning is correct. Be strict with wrong answers.",
        },
        {
          role: "user",
          content: JSON.stringify(questions),
        },
      ],
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return fallbackScores(questions.length)

    const parsed = JSON.parse(content)
    const results = parsed.results || parsed.scores || parsed.grades || parsed

    if (Array.isArray(results) && results.length === questions.length) {
      return results.map((r: any) => ({
        score: typeof r.score === "number" ? Math.max(0.2, Math.min(2.0, r.score)) : 0.2,
        feedback: r.feedback || "",
      }))
    }

    return fallbackScores(questions.length)
  } catch (error) {
    console.error("AI baholashda xatolik:", error)
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
    console.error("OPENAI_API_KEY topilmadi")
    return fallbackVocab(items.length)
  }

  if (items.length === 0) return []

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a vocabulary grader. For each word, the student must translate it to the opposite language. " +
            "If the word is in English → Uzbek answer expected, if the word is in Uzbek → English answer expected, " +
            "for any other language the opposite applies. Check if the student's answer is a correct translation. " +
            "Accept synonyms. If the meaning is correct but spelling is wrong → isCorrect: false, isMisspelled: true. " +
            "If completely correct → isCorrect: true, isMisspelled: false. " +
            "If completely wrong → both false. " +
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

    const content = response.choices[0]?.message?.content
    if (!content) return fallbackVocab(items.length)

    const parsed = JSON.parse(content)
    const results = parsed.results || parsed

    if (Array.isArray(results) && results.length === items.length) {
      return results.map((r: any) => ({
        isCorrect: typeof r.isCorrect === "boolean" ? r.isCorrect : false,
        isMisspelled: typeof r.isMisspelled === "boolean" ? r.isMisspelled : false,
        feedback: r.feedback || "",
      }))
    }

    return fallbackVocab(items.length)
  } catch (error) {
    console.error("AI vocabulary baholashda xatolik:", error)
    return fallbackVocab(items.length)
  }
}

function fallbackVocab(count: number): { isCorrect: boolean; isMisspelled: boolean; feedback: string }[] {
  return Array.from({ length: count }, () => ({
    isCorrect: false,
    isMisspelled: false,
    feedback: "Baholashda xatolik yuz berdi",
  }))
}
