import type { Card, CefrLevel } from "@/types";
import manifest from "@/content/manifest.json";

export type SeedCard = {
    front: string;
    meaningId: string;
    meaningEn: string;
    gender?: "der" | "die" | "das" | null;
    wordType?: Card["wordType"];
    plural?: string | null;
    ipa?: string | null;
    exampleDe?: string | null;
    exampleId?: string | null;
    exampleEn?: string | null;
    tags?: string[];
    level?: CefrLevel;
};

export type SeedFile = {
    courseId: string;
    deck: {
        slug: string;
        name: string;
        description: string;
        level: CefrLevel;
        tags: string[];
    };
    cards: SeedCard[];
};

export type ContentDeck = {
    id: string;
    courseId: string;
    level: CefrLevel;
    name: string;
    description: string;
    tags: string[];
    cardCount: number;
    loader: () => Promise<SeedFile>;
};

/**
 * Static loader map. Bundlers need literal specifiers, so a new deck must add
 * one entry here plus one entry in `src/content/manifest.json`.
 */
const loaders: Record<string, () => Promise<SeedFile>> = {
    "de-a1-core": async () => {
        const loaded = await import("@/content/de/a1-core.json");
        return loaded.default as SeedFile;
    },
    "de-a2-core": async () => {
        const loaded = await import("@/content/de/a2-core.json");
        return loaded.default as SeedFile;
    },
    "de-b1-core": async () => {
        const loaded = await import("@/content/de/b1-core.json");
        return loaded.default as SeedFile;
    },
    "de-b2-core": async () => {
        const loaded = await import("@/content/de/b2-core.json");
        return loaded.default as SeedFile;
    },
    "de-c1-core": async () => {
        const loaded = await import("@/content/de/c1-core.json");
        return loaded.default as SeedFile;
    },
    "de-c2-core": async () => {
        const loaded = await import("@/content/de/c2-core.json");
        return loaded.default as SeedFile;
    },
};

export const contentDecks: ContentDeck[] = manifest.decks.map((deck) => ({
    id: deck.id,
    courseId: manifest.courseId,
    level: deck.level as CefrLevel,
    name: deck.name,
    description: deck.description,
    tags: deck.tags,
    cardCount: deck.cardCount,
    loader: loaders[deck.id],
}));

export const contentDeckIds = new Set(contentDecks.map((deck) => deck.id));

export function isContentDeckId(deckId: string): boolean {
    return contentDeckIds.has(deckId);
}

export function getContentDeck(deckId: string): ContentDeck | null {
    return contentDecks.find((deck) => deck.id === deckId) ?? null;
}

const cardCache = new Map<string, Card[]>();

/** Builds cards for a bundled deck, with stable ids derived from the index. */
export async function loadContentCards(deckId: string): Promise<Card[]> {
    const cached = cardCache.get(deckId);
    if (cached) return cached;

    const deck = getContentDeck(deckId);
    if (!deck || !deck.loader) return [];

    const seed = await deck.loader();
    const cards: Card[] = seed.cards.map((card, index) => ({
        id: `${deck.id}-${String(index + 1).padStart(4, "0")}`,
        deckId: deck.id,
        courseId: deck.courseId,
        front: card.front,
        meaningId: card.meaningId,
        meaningEn: card.meaningEn,
        gender: card.gender ?? null,
        wordType: card.wordType ?? "other",
        plural: card.plural ?? null,
        ipa: card.ipa ?? null,
        exampleDe: card.exampleDe ?? null,
        exampleId: card.exampleId ?? null,
        exampleEn: card.exampleEn ?? null,
        tags: card.tags ?? [],
        level: card.level ?? deck.level,
        source: "seed",
        suspended: false,
        createdAt: 0,
        updatedAt: 0,
    }));

    cardCache.set(deckId, cards);
    return cards;
}

/** Total number of bundled cards for a course, used by the stats page. */
export function contentCardCount(courseId = manifest.courseId): number {
    return contentDecks
        .filter((deck) => deck.courseId === courseId)
        .reduce((sum, deck) => sum + deck.cardCount, 0);
}
