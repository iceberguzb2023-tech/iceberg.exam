import OpenAI from 'openai';

const keyExists = !!process.env.OPENAI_API_KEY;
const keyLength = process.env.OPENAI_API_KEY?.length || 0;
console.log(
  `[AI Init] OPENAI_API_KEY mavjud: ${keyExists}, uzunligi: ${keyLength}`,
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function evaluateOpenQuestions(
  questions: { q: string; modelAnswer: string; studentAnswer: string }[],
): Promise<{ score: number; feedback: string }[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[AI OPEN] XATO: OPENAI_API_KEY topilmadi!');
    return fallbackScores(questions.length);
  }

  if (questions.length === 0) return [];

  // Split: empty answers → direct 0, non-empty → AI
  const emptyIndices: number[] = [];
  const nonEmptyItems: { q: string; modelAnswer: string; studentAnswer: string }[] = [];
  const nonEmptyIndices: number[] = [];

  questions.forEach((item, i) => {
    if (!item.studentAnswer.trim()) {
      emptyIndices.push(i);
    } else {
      nonEmptyItems.push(item);
      nonEmptyIndices.push(i);
    }
  });

  console.log(
    `[AI OPEN] ${questions.length} ta: ${emptyIndices.length} bo'sh, ${nonEmptyItems.length} AI ga`,
  );

  const allResults: ({ score: number; feedback: string } | null)[] = questions.map(() => null);

  // Empty answers → direct 0
  emptyIndices.forEach(i => {
    allResults[i] = { score: 0, feedback: 'Javob berilmagan' };
  });

  if (nonEmptyItems.length === 0) {
    return allResults as { score: number; feedback: string }[];
  }

  console.log(`[AI OPEN] ${nonEmptyItems.length} ta savolni baholash boshlandi...`);

  try {
    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a strict but fair exam grader. Grade each student answer against the model answer. ' +
            "Return a JSON object with a 'results' array. Each item has: 'score' (0.2 to 2.0, float), " +
            "'feedback' (short explanation in Uzbek). " +
            '0.2 = student wrote something but it is completely wrong. ' +
            '0.3 to 2.0 = partially to fully correct. ' +
            'Accept synonyms and minor spelling mistakes if the meaning is correct.',
        },
        {
          role: 'user',
          content: JSON.stringify(nonEmptyItems),
        },
      ],
      response_format: { type: 'json_object' },
    });
    const elapsed = Date.now() - start;
    console.log(
      `[AI OPEN] Javob keldi: ${elapsed}ms, model: ${response.model}, status: ${response.usage?.total_tokens || '?'} tokens`,
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("[AI OPEN] XATO: content bo'sh!");
      nonEmptyIndices.forEach((origIdx) => {
        allResults[origIdx] = { score: 0.2, feedback: 'Baholashda xatolik yuz berdi' };
      });
      return allResults as { score: number; feedback: string }[];
    }

    const parsed = JSON.parse(content);
    let results = parsed.results || parsed.scores || parsed.grades || parsed;

    if (!Array.isArray(results) && typeof results === 'object' && results !== null) {
      const keys = Object.keys(results);
      if (keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
        results = keys.sort((a, b) => Number(a) - Number(b)).map(k => results[k]);
        console.log(`[AI OPEN] Object→Array: ${results.length} ta`);
      }
    }

    if (Array.isArray(results)) {
      console.log(
        `[AI OPEN] Muvaffaqiyatli: ${results.length} ta natija (kutilgan: ${nonEmptyItems.length})`,
      );

      nonEmptyItems.forEach((item, j) => {
        const origIdx = nonEmptyIndices[j];
        const r = results[j];
        if (r) {
          let score = typeof r.score === 'number' ? r.score : 0.2;
          score = Math.max(0.2, Math.min(2.0, score));
          allResults[origIdx] = {
            score,
            feedback: r.feedback || '',
          };
        } else {
          allResults[origIdx] = { score: 0.2, feedback: 'Baholanmadi' };
        }
      });

      return allResults as { score: number; feedback: string }[];
    }

    console.error(
      `[AI OPEN] XATO: natijalar formati noto'g'ri, results:`,
      typeof results,
      Array.isArray(results) ? `length=${results.length}` : 'array emas',
    );
    nonEmptyIndices.forEach((origIdx) => {
      allResults[origIdx] = { score: 0.2, feedback: 'Baholashda xatolik yuz berdi' };
    });
    return allResults as { score: number; feedback: string }[];
  } catch (error: any) {
    console.error(
      '[AI OPEN] XATO baholashda:',
      error?.message || error,
      error?.status ? `status=${error.status}` : '',
      error?.code ? `code=${error.code}` : '',
    );
    nonEmptyIndices.forEach((origIdx) => {
      allResults[origIdx] = { score: 0.2, feedback: 'Baholashda xatolik yuz berdi' };
    });
    return allResults as { score: number; feedback: string }[];
  }
}

function fallbackScores(count: number): { score: number; feedback: string }[] {
  return Array.from({ length: count }, () => ({
    score: 0,
    feedback: 'Baholashda xatolik yuz berdi',
  }));
}

const VOCAB_BATCH_SIZE = 10;

async function callVocabularyAI(
  items: { word: string; studentAnswer: string }[],
): Promise<{ isCorrect: boolean; isMisspelled: boolean; feedback: string }[]> {
  if (items.length === 0) return [];

  const start = Date.now();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          "You are a strict, consistent vocabulary grader for an English-Uzbek learning platform. " +
          "\n\n" +
          "DIRECTION: For each item, 'word' is the prompt word and may be English or Uzbek. " +
          "If 'word' is English, the student must answer in Uzbek. If 'word' is Uzbek, the student must answer in English. " +
          "Accept reasonable synonyms in the target language, not only one 'dictionary' translation.\n" +
          "\n" +
          "ALGORITHM — follow these steps in order for EVERY item, regardless of direction:\n" +
          "Step 1: Determine the correct target-language translation(s) of 'word'.\n" +
          "Step 2: If the student's answer is empty → isCorrect: false, isMisspelled: false.\n" +
          "Step 3: Check if the answer's MEANING matches an acceptable translation (exact word or accepted synonym) " +
          "closely enough that it is clearly an attempt at that same word (not a different, unrelated word).\n" +
          "Step 4: If it is an attempt at the right word, count character-level edit distance (insertions, deletions, " +
          "substitutions, transpositions — case-insensitive, ignore apostrophes) between the student's answer and the " +
          "nearest correct spelling:\n" +
          "  - 0 errors → isCorrect: true, isMisspelled: false.\n" +
          "  - 1-2 errors → isCorrect: false, isMisspelled: true.\n" +
          "  - 3+ errors → isCorrect: false, isMisspelled: false (treat as wrong, not misspelled).\n" +
          "Step 5: If the answer is a different word with a different/unrelated meaning (not just a misspelling of the " +
          "right word) → isCorrect: false, isMisspelled: false, regardless of how close it looks visually.\n" +
          "\n" +
          "CRITICAL RULE — APPLY STEP 4 IN BOTH DIRECTIONS EQUALLY: " +
          "Whether 'word' is English or Uzbek, and whether the student's answer is in English or Uzbek, you MUST run the " +
          "same character-comparison logic. Do NOT treat a slightly-misspelled English answer to an Uzbek prompt any " +
          "differently than a slightly-misspelled Uzbek answer to an English prompt. A 1-2 letter difference is ALWAYS " +
          "isMisspelled: true, never 'wrong translation', in either direction.\n" +
          "\n" +
          "EXAMPLES — English word, Uzbek answer expected:\n" +
          "word='book' (expected 'kitob'), answer='kiitob' → 1 extra letter → isMisspelled: true.\n" +
          "word='village' (expected 'qishloq'), answer='qishlok' → 1 letter substitution → isMisspelled: true.\n" +
          "word='friend' (expected 'do'st'), answer='dost' → apostrophe difference only, ignore it → isCorrect: true.\n" +
          "word='environment' (expected 'atrof-muhit' or 'muhit'), answer='tabiat' (means 'nature') → different word, " +
          "wrong meaning → isCorrect: false, isMisspelled: false.\n" +
          "\n" +
          "EXAMPLES — Uzbek word, English answer expected:\n" +
          "word='do'stlik' (expected 'friendship'), answer='frendship' → 1 letter missing ('i') → isMisspelled: true.\n" +
          "word='qishloq' (expected 'village'), answer='vilage' → 1 letter missing (double 'l' → single) → isMisspelled: true.\n" +
          "word='kitob' (expected 'book'), answer='kiitob' → this is reversed direction from above, but same rule: " +
          "1 extra letter → isMisspelled: true.\n" +
          "word='shahar' (expected 'city'), answer='sity' → phonetic spelling, 1 letter substitution → isMisspelled: true.\n" +
          "word='osmon' (expected 'sky'), answer='free' → completely different word, unrelated meaning → " +
          "isCorrect: false, isMisspelled: false.\n" +
          "word='mountain' (expected 'tog''), answer='tog' → apostrophe/glottal stop mark omitted, extremely common and " +
          "acceptable → isCorrect: true (do NOT penalize missing apostrophes in Uzbek words like tog', sog'liq, yomg'ir).\n" +
          "\n" +
          "SELF-CHECK before finalizing each answer: " +
          "'Did I actually count the letter differences (Step 4), or did I just judge by how foreign/wrong the spelling " +
          "looks?' If you did not count letters, go back and count them now — this is the most common grading mistake. " +
          "Never label something 'wrong translation' (isMisspelled: false) for a 1-2 letter difference from the correct word. " +
          "This applies identically regardless of which language the target word or the student's answer is in.\n" +
          "\n" +
          "Return a JSON object with a 'results' array in the SAME ORDER as the input items. " +
          "Each item must have exactly: 'isCorrect' (boolean), 'isMisspelled' (boolean), " +
          "'feedback' (one short sentence in Uzbek explaining the specific reason, e.g. mention the exact letter error " +
          "if misspelled, or the meaning mismatch if wrong).",
      },
      {
        role: 'user',
        content: JSON.stringify(items),
      },
    ],
    response_format: { type: 'json_object' },
  });

  const elapsed = Date.now() - start;
  console.log(
    `[AI VOCAB] Batch: ${items.length} ta, ${elapsed}ms, tokens: ${response.usage?.total_tokens || '?'}`,
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    console.error("[AI VOCAB] XATO: content bo'sh!");
    return fallbackVocab(items.length);
  }

  console.log(`[AI VOCAB] Raw: ${content.substring(0, 300)}...`);

  const parsed = JSON.parse(content);
  const results = parsed.results || parsed;

  if (Array.isArray(results)) {
    return items.map((_, i) => {
      const r = results[i];
      return r
        ? {
            isCorrect: typeof r.isCorrect === 'boolean' ? r.isCorrect : false,
            isMisspelled:
              typeof r.isMisspelled === 'boolean' ? r.isMisspelled : false,
            feedback: r.feedback || '',
          }
        : {
            isCorrect: false,
            isMisspelled: false,
            feedback: 'Baholanmadi',
          };
    });
  }

  console.error(`[AI VOCAB] XATO: format noto'g'ri, results:`, typeof results);
  return fallbackVocab(items.length);
}

export async function evaluateVocabularyAnswers(
  items: { word: string; studentAnswer: string }[],
): Promise<{ isCorrect: boolean; isMisspelled: boolean; feedback: string }[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[AI VOCAB] XATO: OPENAI_API_KEY topilmadi!');
    return fallbackVocab(items.length);
  }

  if (items.length === 0) return [];

  // Split: empty answers → direct 0, non-empty → AI batches
  const emptyIndices: number[] = [];
  const nonEmptyItems: { word: string; studentAnswer: string }[] = [];
  const nonEmptyIndices: number[] = [];

  items.forEach((item, i) => {
    if (!item.studentAnswer.trim()) {
      emptyIndices.push(i);
    } else {
      nonEmptyItems.push(item);
      nonEmptyIndices.push(i);
    }
  });

  console.log(
    `[AI VOCAB] ${items.length} ta: ${emptyIndices.length} bo'sh, ${nonEmptyItems.length} AI ga`,
  );

  const allResults: ({
    isCorrect: boolean;
    isMisspelled: boolean;
    feedback: string;
  } | null)[] = items.map(() => null);

  // Empty answers → wrong
  emptyIndices.forEach(i => {
    allResults[i] = {
      isCorrect: false,
      isMisspelled: false,
      feedback: 'Javob berilmagan',
    };
  });

  // Batch AI for non-empty
  for (
    let batchStart = 0;
    batchStart < nonEmptyItems.length;
    batchStart += VOCAB_BATCH_SIZE
  ) {
    const batch = nonEmptyItems.slice(
      batchStart,
      batchStart + VOCAB_BATCH_SIZE,
    );
    const batchNum = Math.floor(batchStart / VOCAB_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(nonEmptyItems.length / VOCAB_BATCH_SIZE);
    console.log(
      `[AI VOCAB] Batch ${batchNum}/${totalBatches}: ${batch.length} ta`,
    );

    const batchResults = await callVocabularyAI(batch);

    batchResults.forEach((r, j) => {
      const origIdx = nonEmptyIndices[batchStart + j];
      allResults[origIdx] = r;
    });
  }

  // Log all results
  allResults.forEach((r, i) => {
    if (r) {
      console.log(
        `  [AI VOCAB][${i}] "${items[i].word}" → "${items[i].studentAnswer}" → correct=${r.isCorrect}, misspelled=${r.isMisspelled}, fb="${r.feedback}"`,
      );
    }
  });

  return allResults as {
    isCorrect: boolean;
    isMisspelled: boolean;
    feedback: string;
  }[];
}

function fallbackVocab(
  count: number,
): { isCorrect: boolean; isMisspelled: boolean; feedback: string }[] {
  console.log(`[AI VOCAB] Fallback: ${count} ta so'z 0 ball`);
  return Array.from({ length: count }, () => ({
    isCorrect: false,
    isMisspelled: false,
    feedback: 'Baholashda xatolik yuz berdi',
  }));
}
