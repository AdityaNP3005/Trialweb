import { z } from "zod";

export const cefrLevels = ["A1", "A2", "B1"] as const;
export const wordTypes = [
    "noun",
    "verb",
    "adjective",
    "adverb",
    "phrase",
    "number",
    "other",
] as const;
export const genders = ["der", "die", "das"] as const;
export const cardSources = ["seed", "user", "ai", "import"] as const;

const trimmed = (max: number) => z.string().trim().max(max);

export const cardInputSchema = z.object({
    front: trimmed(160).min(1),
    meaningId: trimmed(240).min(1),
    meaningEn: trimmed(240).min(1),
    deckId: z.string().min(1),
    courseId: z.string().min(1).default("de"),
    gender: z.enum(genders).nullable().default(null),
    wordType: z.enum(wordTypes).default("other"),
    plural: trimmed(160).nullable().default(null),
    ipa: trimmed(120).nullable().default(null),
    exampleDe: trimmed(400).nullable().default(null),
    exampleId: trimmed(400).nullable().default(null),
    exampleEn: trimmed(400).nullable().default(null),
    tags: z.array(trimmed(40)).max(12).default([]),
    level: z.enum(cefrLevels).default("A1"),
    source: z.enum(cardSources).default("user"),
    suspended: z.boolean().default(false),
});

export type CardInputParsed = z.infer<typeof cardInputSchema>;

export const deckInputSchema = z.object({
    name: trimmed(80).min(1),
    description: trimmed(240).default(""),
    level: z.enum(cefrLevels).default("A1"),
    tags: z.array(trimmed(40)).max(12).default([]),
    newPerDay: z.number().int().min(0).max(200).default(10),
});

export const settingsSchema = z.object({
    dailyGoal: z.number().int().min(1).max(500),
    newPerDay: z.number().int().min(0).max(200),
    ttsRate: z.number().min(0.5).max(2),
    ttsVoiceURI: z.string().nullable(),
});

/** Shape returned by the AI route after validation. */
export const aiCardSchema = z.object({
    front: z.string().trim().min(1).max(160),
    meaningId: z.string().trim().min(1).max(240),
    meaningEn: z.string().trim().min(1).max(240),
    gender: z.enum(genders).nullable().default(null),
    wordType: z.enum(wordTypes).default("other"),
    plural: z.string().trim().max(160).nullable().default(null),
    exampleDe: z.string().trim().max(400).nullable().default(null),
    exampleId: z.string().trim().max(400).nullable().default(null),
    exampleEn: z.string().trim().max(400).nullable().default(null),
    tags: z.array(z.string().trim().max(40)).max(8).default([]),
});

export const aiResponseSchema = z.object({
    cards: z.array(aiCardSchema).min(1).max(20),
});

export const aiRequestSchema = z.object({
    topic: z.string().trim().min(2).max(200),
    count: z.number().int().min(1).max(20).default(10),
    level: z.enum(cefrLevels).default("A1"),
});

export type AiCard = z.infer<typeof aiCardSchema>;
export type AiRequest = z.infer<typeof aiRequestSchema>;

/** Accepts values like "der Apfel" and separates the article. */
export function splitGermanArticle(front: string): {
    gender: "der" | "die" | "das" | null;
    word: string;
} {
    const match = front.match(/^(der|die|das)\s+(.+)$/i);
    if (!match) return { gender: null, word: front };
    return {
        gender: match[1].toLowerCase() as "der" | "die" | "das",
        word: match[2],
    };
}
