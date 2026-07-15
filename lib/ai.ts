import OpenAI from 'openai';

const keyExists = !!process.env.OPENAI_API_KEY;
const keyLength = process.env.OPENAI_API_KEY?.length || 0;
console.log(
  `[AI Init] OPENAI_API_KEY mavjud: ${keyExists}, uzunligi: ${keyLength}`,
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const OPEN_BATCH_SIZE = 10;

const OPEN_SCHEMA = {
  name: 'open_grades',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            feedback: { type: 'string' },
          },
          required: ['score', 'feedback'],
          additionalProperties: false,
        },
      },
    },
    required: ['results'],
    additionalProperties: false,
  },
} as const;

const OPEN_SYSTEM_PROMPT =
  'You are a strict but fair English exam grader. Grade each student answer against the model answer. ' +
  'The student must answer in the SAME LANGUAGE as the model answer. ' +
  "Return a JSON object with a 'results' array (SAME ORDER as input). " +
  "Each result has: 'score' (0.2 to 2.0, float), 'feedback' (short explanation in Uzbek). " +
  '0.2 = student wrote something but it is completely wrong. ' +
  '0.3 to 2.0 = partially to fully correct. ' +
  'Accept synonyms and minor spelling mistakes if the meaning is correct.';

async function callOpenAIBatch(
  items: { q: string; modelAnswer: string; studentAnswer: string }[],
): Promise<{ score: number; feedback: string }[] | null> {
  if (items.length === 0) return [];

  const start = Date.now();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: OPEN_SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(items) },
    ],
    response_format: { type: 'json_schema', json_schema: OPEN_SCHEMA },
  });

  const elapsed = Date.now() - start;
  console.log(
    `[AI OPEN] Batch: ${items.length} ta, ${elapsed}ms, tokens: ${response.usage?.total_tokens || '?'}`,
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    console.error('[AI OPEN] XATO: content bo\'sh!');
    return null;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content) as any;
  } catch {
    console.error('[AI OPEN] XATO: JSON parse error');
    return null;
  }

  const results = parsed.results || parsed;
  if (!Array.isArray(results)) {
    console.error('[AI OPEN] XATO: results not an array');
    return null;
  }

  return items.map((_, i) => {
    const r = results[i];
    if (!r) return { score: 0, feedback: 'Baholanmadi' };

    let score = typeof r.score === 'number' ? r.score : 0.2;
    score = Math.max(0.2, Math.min(2.0, score));
    return { score, feedback: r.feedback || '' };
  });
}

export async function evaluateOpenQuestions(
  questions: { q: string; modelAnswer: string; studentAnswer: string }[],
): Promise<{ score: number; feedback: string }[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[AI OPEN] XATO: OPENAI_API_KEY topilmadi!');
    return Array.from({ length: questions.length }, () => ({
      score: 0, feedback: 'Baholashda xatolik yuz berdi',
    }));
  }

  if (questions.length === 0) return [];

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

  emptyIndices.forEach(i => {
    allResults[i] = { score: 0, feedback: 'Javob berilmagan' };
  });

  if (nonEmptyItems.length === 0) {
    return allResults as { score: number; feedback: string }[];
  }

  // Batch grading with individual fallback on mismatch
  for (
    let batchStart = 0;
    batchStart < nonEmptyItems.length;
    batchStart += OPEN_BATCH_SIZE
  ) {
    const batchItems = nonEmptyItems.slice(batchStart, batchStart + OPEN_BATCH_SIZE);
    const batchIndices = nonEmptyIndices.slice(batchStart, batchStart + OPEN_BATCH_SIZE);

    console.log(`[AI OPEN] Batch ${Math.floor(batchStart / OPEN_BATCH_SIZE) + 1}: ${batchItems.length} ta`);

    const batchResults = await callOpenAIBatch(batchItems);

    if (batchResults && batchResults.length === batchItems.length) {
      // Batch succeeded
      batchResults.forEach((r, j) => {
        allResults[batchIndices[j]] = r;
      });
      continue;
    }

    // Count mismatch → grade each item individually
    console.warn(`[AI OPEN] Batch count mismatch, grading ${batchItems.length} items individually...`);
    for (let j = 0; j < batchItems.length; j++) {
      const single = await callOpenAIBatch([batchItems[j]]);
      if (single && single.length === 1) {
        allResults[batchIndices[j]] = single[0];
      } else {
        allResults[batchIndices[j]] = { score: 0.2, feedback: 'Baholashda xatolik yuz berdi' };
      }
    }
  }

  // Post-validation: any non-empty answer with 0.0 → re-grade individually
  const zeroScoreNonEmpty: number[] = [];
  nonEmptyIndices.forEach(origIdx => {
    const r = allResults[origIdx];
    if (r && r.score === 0) {
      zeroScoreNonEmpty.push(origIdx);
    }
  });

  if (zeroScoreNonEmpty.length > 0) {
    console.warn(`[AI OPEN] Post-validation: ${zeroScoreNonEmpty.length} ta noto'g'ri 0.0 topildi, qayta baholanmoqda...`);
    for (const origIdx of zeroScoreNonEmpty) {
      const itemIdx = nonEmptyIndices.indexOf(origIdx);
      const item = nonEmptyItems[itemIdx];
      const single = await callOpenAIBatch([item]);
      if (single && single.length === 1 && single[0].score > 0) {
        allResults[origIdx] = single[0];
      } else {
        allResults[origIdx] = { score: 0.2, feedback: 'Baholashda xatolik yuz berdi' };
      }
    }
  }

  return allResults as { score: number; feedback: string }[];
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
