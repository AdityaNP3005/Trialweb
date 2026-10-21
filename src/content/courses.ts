import type { CefrLevel, Deck, DeckProgress } from "@/types";
import { contentTopics, loadContentCards, topicsForLevel } from "@/lib/content/registry";

export type Course = {
    id: string;
    name: string;
    nativeName: string;
    flag: string;
    speechLocale: string;
    levels: CefrLevel[];
    enabled: boolean;
};

/**
 * Adding a language = add content under `src/content/<id>/`, register the level
 * files in `src/lib/content/registry.ts` and add one entry here.
 */
export const courses: Course[] = [
    {
        id: "de",
        name: "German",
        nativeName: "Deutsch",
        flag: "🇩🇪",
        speechLocale: "de-DE",
        levels: ["A1", "A2", "B1", "B2", "C1", "C2"],
        enabled: true,
    },
];

export const defaultCourse = courses.find((course) => course.enabled) ?? courses[0];

export function getCourse(id: string | null | undefined): Course {
    return courses.find((course) => course.id === id) ?? defaultCourse;
}

/** Bundled topics exposed as normal `Deck` objects (read-only). */
export function listContentDecks(courseId = defaultCourse.id): Deck[] {
    return contentTopics
        .filter((topic) => topic.courseId === courseId)
        .map((topic) => ({
            id: topic.id,
            courseId: topic.courseId,
            name: topic.title,
            description: "",
            level: topic.level,
            tags: [topic.key, topic.level.toLowerCase()],
            cardCount: topic.cardCount,
            source: "content" as const,
            isDefault: topic.level === "A1" && topic.order === 1,
            readOnly: true,
            topicKey: topic.key,
            icon: topic.icon,
            topicOrder: topic.order,
            createdAt: 0,
            updatedAt: 0,
        }));
}

export function listContentDecksForLevel(
    level: CefrLevel,
    courseId = defaultCourse.id,
): Deck[] {
    const ids = new Set(topicsForLevel(level).map((topic) => topic.id));
    return listContentDecks(courseId).filter((deck) => ids.has(deck.id));
}

export async function getContentDeckCards(deckId: string) {
    return loadContentCards(deckId);
}

export type BandSummary = {
    level: CefrLevel;
    topics: number;
    total: number;
    known: number;
    percent: number;
    topicsDone: number;
    nextTopic: Deck | null;
};

/** Roll-up of all topic progress inside one band. */
export function summarizeBand(
    level: CefrLevel,
    decks: Deck[],
    progress: Map<string, DeckProgress>,
): BandSummary {
    const bandDecks = decks
        .filter((deck) => deck.level === level && deck.source === "content")
        .sort((a, b) => (a.topicOrder ?? 0) - (b.topicOrder ?? 0));

    const total = bandDecks.reduce((sum, deck) => sum + deck.cardCount, 0);
    const known = bandDecks.reduce(
        (sum, deck) => sum + (progress.get(deck.id)?.known ?? 0),
        0,
    );
    const topicsDone = bandDecks.filter(
        (deck) => (progress.get(deck.id)?.percent ?? 0) >= 100,
    ).length;
    const nextTopic =
        bandDecks.find((deck) => (progress.get(deck.id)?.percent ?? 0) < 100) ??
        bandDecks[0] ??
        null;

    return {
        level,
        topics: bandDecks.length,
        total,
        known,
        percent: total > 0 ? Math.round((known / total) * 100) : 0,
        topicsDone,
        nextTopic,
    };
}

export function isContentLevel(level: string | null | undefined): level is CefrLevel {
    return Boolean(level && courses[0].levels.includes(level as CefrLevel));
}
