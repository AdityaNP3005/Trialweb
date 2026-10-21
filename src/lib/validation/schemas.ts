import { z } from "zod";

export const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
/** Section id of a course: a CEFR band ("A1") or a book ("book1"). */
export const sectionIdSchema = z.string().trim().min(1).max(24);
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
export const cardSources = ["seed", "user", "import"] as const;

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
    level: sectionIdSchema.default("A1"),
    source: z.enum(cardSources).default("user"),
    suspended: z.boolean().default(false),
});

export type CardInputParsed = z.infer<typeof cardInputSchema>;

export const deckInputSchema = z.object({
    name: trimmed(80).min(1),
    description: trimmed(240).default(""),
    level: z.enum(cefrLevels).default("A1"),
    tags: z.array(trimmed(40)).max(12).default([]),
});

export const bandSettingSchema = z.object({
    sessionSize: z.number().int().min(5).max(100),
    shuffle: z.boolean().default(false),
});

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
