export interface PracticeSuggestionItem {
  id: string;
  type: "mcq" | "true_false" | "match" | "anagram";
  prompt: string;
  data: MCQData | TrueFalseData | MatchData | AnagramData;
  difficultyRating: number;
  estimatedTime: number;
  keywords: string[];
}

export interface MCQData {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface TrueFalseData {
  statement: string;
  correct: boolean;
}

export interface MatchData {
  left: string[];
  right: string[];
  pairs: Record<number, number>;
}

export interface AnagramData {
  letters: string[];
  target: string;
}

export function generateExerciseId(): string {
  return `exercise_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function getDifficultyRange(elo: number): { min: number; max: number } {
  return {
    min: Math.max(0, elo - 150),
    max: Math.min(3000, elo + 150), // Cap at 3000 to avoid unrealistic difficulty
  };
}

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

function clampDifficulty(value: number, elo: number): number {
  const range = getDifficultyRange(elo);
  return Math.max(range.min, Math.min(range.max, Math.floor(value)));
}

function defaultEstimatedTime(type: PracticeSuggestionItem["type"]): number {
  switch (type) {
    case "mcq":
      return 30;
    case "true_false":
      return 15;
    case "match":
      return 60;
    case "anagram":
      return 45;
  }
}

function clampEstimatedTime(
  value: number,
  type: PracticeSuggestionItem["type"]
): number {
  const base = defaultEstimatedTime(type);
  const v = Math.floor(Number.isFinite(value) ? value : base);
  return Math.max(5, Math.min(600, v));
}

function normalizeItem(
  raw: unknown,
  elo: number
): PracticeSuggestionItem | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const type = obj.type as PracticeSuggestionItem["type"];
  if (!["mcq", "true_false", "match", "anagram"].includes(type)) return null;

  const id =
    typeof obj.id === "string" && obj.id.length > 0
      ? (obj.id as string)
      : generateExerciseId();
  const prompt = typeof obj.prompt === "string" ? (obj.prompt as string) : "";
  const difficultyRating = clampDifficulty(
    typeof obj.difficultyRating === "number"
      ? (obj.difficultyRating as number)
      : elo,
    elo
  );
  const estimatedTime =
    typeof obj.estimatedTime === "number"
      ? clampEstimatedTime(obj.estimatedTime as number, type)
      : defaultEstimatedTime(type);
  const keywords =
    Array.isArray(obj.keywords) && obj.keywords.length > 0
      ? (obj.keywords as unknown[]).map(String)
      : [];

  let data: MCQData | TrueFalseData | MatchData | AnagramData | null = null;

  switch (type) {
    case "mcq": {
      const rawData = obj.data as Record<string, unknown> | undefined;
      if (
        rawData &&
        typeof rawData.question === "string" &&
        Array.isArray(rawData.options)
      ) {
        const options = (rawData.options as unknown[]).map(String).slice(0, 8);
        let correctIndex: number | null = null;
        if (typeof rawData.correctIndex === "number") {
          correctIndex = Math.max(
            0,
            Math.min(
              options.length - 1,
              Math.floor(rawData.correctIndex as number)
            )
          );
        } else if (typeof rawData.answer === "string") {
          const idx = options.findIndex((o) => o === String(rawData.answer));
          correctIndex = idx >= 0 ? idx : null;
        }
        const resolvedIndex = correctIndex ?? 0;
        data = {
          question: rawData.question as string,
          options,
          correctIndex: resolvedIndex,
        };
      }
      break;
    }
    case "true_false":
      {
        const rawData = obj.data as Record<string, unknown> | undefined;
        if (
          rawData &&
          typeof rawData.statement === "string" &&
          (typeof rawData.correct === "boolean" ||
            typeof rawData.answer === "boolean")
        ) {
          data = {
            statement: rawData.statement as string,
            correct:
              typeof rawData.correct === "boolean"
                ? !!rawData.correct
                : !!rawData.answer,
          };
        }
      }
      break;
    case "match":
      {
        const rawData = obj.data as Record<string, unknown> | undefined;
        if (
          rawData &&
          Array.isArray(rawData.left) &&
          Array.isArray(rawData.right)
        ) {
          const left = (rawData.left as unknown[]).map(String);
          const right = (rawData.right as unknown[]).map(String);
          const pairs: Record<number, number> = {};
          const pairsSource = rawData.pairs as
            | Record<string, unknown>
            | unknown[]
            | undefined;
          if (Array.isArray(pairsSource)) {
            for (const p of pairsSource) {
              const i = Number((p as Record<string, unknown>).i as number);
              const v = Number((p as Record<string, unknown>).v as number);
              if (Number.isFinite(i) && Number.isFinite(v)) pairs[i] = v;
            }
          } else if (pairsSource && typeof pairsSource === "object") {
            for (const k of Object.keys(pairsSource)) {
              const i = Number(k);
              const v = Number(pairsSource[k] as unknown as string | number);
              if (Number.isFinite(i) && Number.isFinite(v)) pairs[i] = v;
            }
          } else {
            for (let i = 0; i < Math.min(left.length, right.length); i++)
              pairs[i] = i;
          }
          data = { left, right, pairs };
        }
      }
      break;
    case "anagram":
      {
        const rawData = obj.data as Record<string, unknown> | undefined;
        if (
          rawData &&
          ((Array.isArray(rawData.letters) &&
            typeof rawData.target === "string") ||
            (typeof rawData.scrambled === "string" &&
              typeof rawData.answer === "string"))
        ) {
          const letters = Array.isArray(rawData.letters)
            ? (rawData.letters as unknown[]).map(String)
            : String(rawData.scrambled).split("");
          const target =
            typeof rawData.target === "string"
              ? String(rawData.target)
              : String(rawData.answer);
          data = { letters, target };
        }
      }
      break;
  }

  if (!data) return null;

  return { id, type, prompt, data, difficultyRating, estimatedTime, keywords };
}

export class SuggestionsUnavailableError extends Error {}

async function generatePracticeSuggestionsAI(
  keywords: string[],
  elo: number,
  limit: number,
  nativeLanguage: string,
  targetLanguage: string
): Promise<PracticeSuggestionItem[]> {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new SuggestionsUnavailableError("Google API key not set");
  const googleProvider = createGoogleGenerativeAI({ apiKey });
  const model = googleProvider("gemini-2.5-flash");
  const difficulty = getDifficultyRange(elo);

  const system = `You are an English practice item generator. Output STRICT JSON only. Language for prompts and content is ${targetLanguage}.`;
  const developer = `Return exactly ${limit} items. Types must be one of mcq, true_false, match, anagram. difficultyRating must be in [${difficulty.min}, ${difficulty.max}]. Schema per item: { id: string, type, prompt: string, data: type-specific, difficultyRating: number, estimatedTime: number, keywords: string[] }. For mcq.data use { question: string, options: string[], correctIndex: number }. For true_false.data use { statement: string, correct: boolean }. For match.data use { left: string[], right: string[], pairs: Array<{ i: number, v: number }> } mapping indices. For anagram.data use { letters: string[], target: string }.`;
  const user = {
    nativeLanguage,
    targetLanguage,
    elo,
    limit,
    keywords: (keywords && keywords.length > 0
      ? keywords
      : [
          "family",
          "work",
          "food",
          "travel",
          "health",
          "shopping",
          "school",
          "weather",
          "transport",
          "daily routines",
        ]
    ).slice(0, 10),
    diversity: true,
  };

  const prompt = [
    `Developer: ${developer}`,
    `User: ${JSON.stringify(user)}`,
  ].join("\n");

  const itemSchema = z.object({
    id: z.string(),
    type: z.enum(["mcq", "true_false", "match", "anagram"]),
    prompt: z.string(),
    difficultyRating: z.number(),
    estimatedTime: z.number(),
    keywords: z.array(z.string()),
    data: z
      .object({
        question: z.string().optional(),
        options: z.array(z.string()).optional(),
        correctIndex: z.number().optional(),
        statement: z.string().optional(),
        correct: z.boolean().optional(),
        left: z.array(z.string()).optional(),
        right: z.array(z.string()).optional(),
        pairs: z.array(z.object({ i: z.number(), v: z.number() })).optional(),
        letters: z.array(z.string()).optional(),
        target: z.string().optional(),
        scrambled: z.string().optional(),
      })
      .passthrough(),
  });

  const { object: itemsArray } = await generateObject({
    model,
    system,
    schema: z.array(itemSchema),
    prompt,
    providerOptions: {
      google: {
        structuredOutputs: true,
      },
    },
  });
  const normalized: PracticeSuggestionItem[] = [];
  for (const rawItem of itemsArray) {
    const item = normalizeItem(rawItem, elo);
    if (item) normalized.push(item);
    if (normalized.length >= limit) break;
  }

  return normalized;
}

function dedupeItems(
  items: PracticeSuggestionItem[]
): PracticeSuggestionItem[] {
  const byId = new Set<string>();
  const byKey = new Set<string>();
  const out: PracticeSuggestionItem[] = [];
  for (const it of items) {
    const key = `${it.type}|${it.prompt}`;
    if (byId.has(it.id) || byKey.has(key)) continue;
    byId.add(it.id);
    byKey.add(key);
    out.push(it);
  }
  return out;
}

export async function generatePracticeSuggestions(
  keywords: string[],
  elo: number,
  limit: number = 4,
  nativeLanguage: string = "vi",
  targetLanguage: string = "en"
): Promise<PracticeSuggestionItem[]> {
  const hasKey = !!(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY
  );
  if (!hasKey) {
    throw new SuggestionsUnavailableError("AI model unavailable");
  }
  try {
    const aiItems = await generatePracticeSuggestionsAI(
      keywords,
      elo,
      limit,
      nativeLanguage,
      targetLanguage
    );
    return dedupeItems(aiItems).slice(0, limit);
  } catch (e) {
    console.error("AI model error:", e);
    throw new SuggestionsUnavailableError("AI model error");
  }
}
