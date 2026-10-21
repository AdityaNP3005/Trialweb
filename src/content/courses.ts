import type { CardScript, Deck, DeckProgress, SectionId } from "@/types";
import {
    contentUnits,
    loadContentCards,
    sectionsForCourse,
    topicsForLevel,
} from "@/lib/content/registry";

export type Course = {
    id: string;
    name: string;
    nativeName: string;
    flag: string;
    speechLocale: string;
    script: CardScript;
    /** "band" (CEFR) or "book" (textbook volume) — drives UI copy. */
    unitNoun: "band" | "book";
    /** "topic" or "chapter" — one study session. */
    chapterNoun: "topic" | "chapter";
    enabled: boolean;
};

/**
 * Adding a language = add content under `src/content/<id>/`, register the file
 * loaders in `src/lib/content/registry.ts` and add one entry here.
 */
export const courses: Course[] = [
    {
        id: "de",
        name: "German",
        nativeName: "Deutsch",
        flag: "🇩🇪",
        speechLocale: "de-DE",
        script: "latin",
        unitNoun: "band",
        chapterNoun: "topic",
        enabled: true,
    },
    {
        id: "zh",
        name: "Mandarin (traditional)",
        nativeName: "華語",
        flag: "🇹🇼",
        speechLocale: "zh-TW",
        script: "hanzi",
        unitNoun: "book",
        chapterNoun: "chapter",
        enabled: true,
    },
];

export const defaultCourse = courses.find((course) => course.enabled) ?? courses[0];

export function getCourse(id: string | null | undefined): Course {
    return courses.find((course) => course.id === id) ?? defaultCourse;
}

/** Resolves the course that owns a section id ("A1" → de, "book1" → zh). */
export function getCourseForSection(sectionId: SectionId | null | undefined): Course | null {
    if (!sectionId) return null;
    return (
        courses.find((course) =>
            sectionsForCourse(course.id).some((section) => section.id === sectionId),
        ) ?? null
    );
}

export function courseSections(courseId: string) {
    return sectionsForCourse(courseId);
}

/** Bundled units exposed as normal `Deck` objects (read-only). */
export function listContentDecks(courseId = defaultCourse.id): Deck[] {
    return contentUnits
        .filter((unit) => unit.courseId === courseId)
        .map((unit) => ({
            id: unit.id,
            courseId: unit.courseId,
            name: unit.title,
            description: "",
            level: unit.sectionId,
            tags: [unit.key, unit.sectionId],
            cardCount: unit.cardCount,
            source: "content" as const,
            isDefault:
                unit.sectionId === sectionsForCourse(courseId)[0]?.id && unit.order === 1,
            readOnly: true,
            topicKey: unit.key,
            icon: unit.icon,
            topicOrder: unit.order,
            sectionLabel: unit.sectionLabel,
            chapterNumber: unit.chapterNumber,
            createdAt: 0,
            updatedAt: 0,
        }));
}

export function listContentDecksForLevel(
    level: SectionId,
    courseId?: string,
): Deck[] {
    const owner = courseId ?? getCourseForSection(level)?.id ?? defaultCourse.id;
    const ids = new Set(topicsForLevel(level).map((unit) => unit.id));
    return listContentDecks(owner).filter((deck) => ids.has(deck.id));
}

export async function getContentDeckCards(deckId: string) {
    return loadContentCards(deckId);
}

export type BandSummary = {
    level: SectionId;
    topics: number;
    total: number;
    known: number;
    percent: number;
    topicsDone: number;
    nextTopic: Deck | null;
};

/** Roll-up of all unit progress inside one section (band or book). */
export function summarizeSection(
    level: SectionId,
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

    /**
     * A unit is done once the learner finished a whole cycle, not when the
     * running cycle happens to be full. Cycles reset to 0 known cards, so
     * using the running cycle would send "continue" back to chapter 1 forever.
     */
    const isDone = (deckId: string) => {
        const entry = progress.get(deckId);
        if (!entry) return false;
        return entry.cycle > 1 || (entry.total > 0 && entry.known >= entry.total);
    };

    const topicsDone = bandDecks.filter((deck) => isDone(deck.id)).length;
    const nextTopic =
        bandDecks.find((deck) => !isDone(deck.id)) ?? bandDecks[0] ?? null;

    return {
        level,
        topics: bandDecks.length,
        total,
        known,
        percent:
            bandDecks.length > 0
                ? Math.round((topicsDone / bandDecks.length) * 100)
                : 0,
        topicsDone,
        nextTopic,
    };
}

/** @deprecated use `summarizeSection` (bands and books share the same logic). */
export const summarizeBand = summarizeSection;

export function isContentSection(sectionId: SectionId | null | undefined): boolean {
    return Boolean(getCourseForSection(sectionId));
}

/** @deprecated use `isContentSection` */
export const isContentLevel = isContentSection;
