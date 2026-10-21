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
    topic?: string;
};

export type LevelFile = {
    courseId: string;
    level: CefrLevel;
    topics: { id: string; key: string; title: string; icon: string; order: number; cardCount: number }[];
    cards: SeedCard[];
};

export type ContentTopic = {
    /** Deck id, e.g. `de-a1-greetings`. */
    id: string;
    courseId: string;
    level: CefrLevel;
    key: string;
    title: string;
    icon: string;
    order: number;
    cardCount: number;
    file: string;
};

/** Static loader map (bundlers need literal specifiers). */
const loaders: Record<string, () => Promise<LevelFile>> = {
    a1: async () => (await import("@/content/de/a1.json")).default as LevelFile,
    a2: async () => (await import("@/content/de/a2.json")).default as LevelFile,
    b1: async () => (await import("@/content/de/b1.json")).default as LevelFile,
    b2: async () => (await import("@/content/de/b2.json")).default as LevelFile,
    c1: async () => (await import("@/content/de/c1.json")).default as LevelFile,
    c2: async () => (await import("@/content/de/c2.json")).default as LevelFile,
};

export const contentTopics: ContentTopic[] = manifest.levels.flatMap((level) =>
    level.topics.map((topic) => ({
        id: topic.id,
        courseId: manifest.courseId,
        level: level.level as CefrLevel,
        key: topic.key,
        title: topic.title,
        icon: topic.icon,
        order: topic.order,
        cardCount: topic.cardCount,
        file: level.file,
    })),
);

export const contentDeckIds = new Set(contentTopics.map((topic) => topic.id));

export function isContentDeckId(deckId: string): boolean {
    return contentDeckIds.has(deckId);
}

export function getContentDeck(deckId: string): ContentTopic | null {
    return contentTopics.find((topic) => topic.id === deckId) ?? null;
}

export function topicsForLevel(level: CefrLevel): ContentTopic[] {
    return contentTopics
        .filter((topic) => topic.level === level)
        .sort((a, b) => a.order - b.order);
}

const cardCache = new Map<string, Card[]>();

/** Builds the cards of one topic, with ids derived from the topic position. */
export async function loadContentCards(deckId: string): Promise<Card[]> {
    const cached = cardCache.get(deckId);
    if (cached) return cached;

    const topic = getContentDeck(deckId);
    if (!topic) return [];

    const loader = loaders[topic.file.replace(".json", "")];
    if (!loader) return [];

    const level = await loader();
    const topicCards = level.cards.filter((card) => card.topic === topic.key);

    const cards: Card[] = topicCards.map((card, index) => ({
        id: `${topic.id}-${String(index + 1).padStart(4, "0")}`,
        deckId: topic.id,
        courseId: topic.courseId,
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
        level: card.level ?? topic.level,
        source: "seed",
        suspended: false,
        createdAt: 0,
        updatedAt: 0,
    }));

    cardCache.set(deckId, cards);
    return cards;
}

export function contentCardCount(courseId = manifest.courseId): number {
    return contentTopics
        .filter((topic) => topic.courseId === courseId)
        .reduce((sum, topic) => sum + topic.cardCount, 0);
}
