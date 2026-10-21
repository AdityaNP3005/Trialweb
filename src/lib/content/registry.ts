import type { Card, CardScript, SectionId } from "@/types";
import deManifest from "@/content/manifest.json";
import zhManifest from "@/content/zh/manifest.json";

export type SeedCard = {
    front: string;
    meaningId: string;
    meaningEn: string;
    gender?: "der" | "die" | "das" | null;
    wordType?: Card["wordType"];
    plural?: string | null;
    ipa?: string | null;
    /** Mandarin: tone-marked pinyin. */
    pinyin?: string | null;
    exampleDe?: string | null;
    exampleId?: string | null;
    exampleEn?: string | null;
    tags?: string[];
    level?: SectionId;
    /** German: topic key. */
    topic?: string;
    /** Mandarin: chapter key (e.g. "l01"). */
    chapter?: string;
};

export type CourseFile = {
    courseId: string;
    cards: SeedCard[];
};

export type ContentSection = {
    id: SectionId;
    courseId: string;
    /** Short label used in badges: "A1" or "Buku 1". */
    label: string;
    /** Longer title: "Buku 1" or "當代中文課程 1". */
    title: string;
    order: number;
    script: CardScript;
    /** Unit noun used for i18n ("band" or "book"). */
    unitNoun: "band" | "book";
};

export type ContentUnit = {
    /** Deck id, e.g. `de-a1-greetings` or `zh-book1-l01`. */
    id: string;
    courseId: string;
    sectionId: SectionId;
    sectionOrder: number;
    sectionLabel: string;
    key: string;
    title: string;
    icon: string;
    order: number;
    cardCount: number;
    file: string;
    script: CardScript;
    chapterNumber?: number;
    /** Back-compat alias of `sectionId`, used by older call sites. */
    level: SectionId;
};

type DeManifest = {
    version: number;
    courseId: string;
    levels: {
        level: string;
        order: number;
        file: string;
        topics: {
            id: string;
            key: string;
            title: string;
            icon: string;
            order: number;
            cardCount: number;
        }[];
    }[];
};

type ZhManifest = {
    version: number;
    courseId: string;
    books: {
        id: string;
        label: string;
        title: string;
        order: number;
        file: string;
        chapters: {
            id: string;
            key: string;
            title: string;
            icon: string;
            order: number;
            cardCount: number;
        }[];
    }[];
};

/** Static loader map (bundlers need literal specifiers). */
const loaders: Record<string, () => Promise<CourseFile>> = {
    "de:a1": async () => (await import("@/content/de/a1.json")).default as CourseFile,
    "de:a2": async () => (await import("@/content/de/a2.json")).default as CourseFile,
    "de:b1": async () => (await import("@/content/de/b1.json")).default as CourseFile,
    "de:b2": async () => (await import("@/content/de/b2.json")).default as CourseFile,
    "de:c1": async () => (await import("@/content/de/c1.json")).default as CourseFile,
    "de:c2": async () => (await import("@/content/de/c2.json")).default as CourseFile,
    "zh:book1": async () =>
        (await import("@/content/zh/book1.json")).default as CourseFile,
    "zh:book2": async () =>
        (await import("@/content/zh/book2.json")).default as CourseFile,
    "zh:book3": async () =>
        (await import("@/content/zh/book3.json")).default as CourseFile,
    "zh:book4": async () =>
        (await import("@/content/zh/book4.json")).default as CourseFile,
};

function deSections(): ContentSection[] {
    return (deManifest as DeManifest).levels.map((level) => ({
        id: level.level,
        courseId: deManifest.courseId,
        label: level.level,
        title: level.level,
        order: level.order,
        script: "latin",
        unitNoun: "band",
    }));
}

function deUnits(): ContentUnit[] {
    return (deManifest as DeManifest).levels.flatMap((level) =>
        level.topics.map((topic) => ({
            id: topic.id,
            courseId: deManifest.courseId,
            sectionId: level.level,
            sectionOrder: level.order,
            sectionLabel: level.level,
            key: topic.key,
            title: topic.title,
            icon: topic.icon,
            order: topic.order,
            cardCount: topic.cardCount,
            file: level.file,
            script: "latin" as const,
            level: level.level,
        })),
    );
}

function zhSections(): ContentSection[] {
    return (zhManifest as ZhManifest).books.map((book) => ({
        id: book.id,
        courseId: zhManifest.courseId,
        label: book.label,
        title: book.title,
        order: book.order,
        script: "hanzi",
        unitNoun: "book",
    }));
}

function zhUnits(): ContentUnit[] {
    return (zhManifest as ZhManifest).books.flatMap((book) =>
        book.chapters.map((chapter) => ({
            id: chapter.id,
            courseId: zhManifest.courseId,
            sectionId: book.id,
            sectionOrder: book.order,
            sectionLabel: book.label,
            key: chapter.key,
            title: chapter.title,
            icon: chapter.icon,
            order: chapter.order,
            cardCount: chapter.cardCount,
            file: book.file,
            script: "hanzi" as const,
            chapterNumber: chapter.order,
            level: book.id,
        })),
    );
}

export const contentSections: ContentSection[] = [...deSections(), ...zhSections()];
export const contentUnits: ContentUnit[] = [...deUnits(), ...zhUnits()];

/** German units, kept for older imports. */
export const contentTopics: ContentUnit[] = contentUnits.filter(
    (unit) => unit.courseId === "de",
);

export const contentDeckIds = new Set(contentUnits.map((unit) => unit.id));

export function isContentDeckId(deckId: string): boolean {
    return contentDeckIds.has(deckId);
}

export function getContentDeck(deckId: string): ContentUnit | null {
    return contentUnits.find((unit) => unit.id === deckId) ?? null;
}

export function sectionsForCourse(courseId: string): ContentSection[] {
    return contentSections
        .filter((section) => section.courseId === courseId)
        .sort((a, b) => a.order - b.order);
}

export function getSection(sectionId: SectionId | null | undefined): ContentSection | null {
    if (!sectionId) return null;
    const needle = String(sectionId).toLowerCase();
    return (
        contentSections.find((section) => section.id.toLowerCase() === needle) ?? null
    );
}

export function unitsForSection(courseId: string, sectionId: SectionId): ContentUnit[] {
    return contentUnits
        .filter((unit) => unit.courseId === courseId && unit.sectionId === sectionId)
        .sort((a, b) => a.order - b.order);
}

/** Topics of one section, regardless of course (used by the section page). */
export function topicsForLevel(level: SectionId): ContentUnit[] {
    return contentUnits
        .filter((unit) => unit.level === level)
        .sort((a, b) => a.order - b.order);
}

const cardCache = new Map<string, Card[]>();

/** Builds the cards of one unit, with ids derived from the unit position. */
export async function loadContentCards(deckId: string): Promise<Card[]> {
    const cached = cardCache.get(deckId);
    if (cached) return cached;

    const unit = getContentDeck(deckId);
    if (!unit) return [];

    const loader = loaders[`${unit.courseId}:${unit.file.replace(".json", "")}`];
    if (!loader) return [];

    const courseFile = await loader();
    const unitCards = courseFile.cards.filter(
        (card) => (card.topic ?? card.chapter) === unit.key,
    );

    const cards: Card[] = unitCards.map((card, index) => ({
        id: `${unit.id}-${String(index + 1).padStart(4, "0")}`,
        deckId: unit.id,
        courseId: unit.courseId,
        front: card.front,
        meaningId: card.meaningId,
        meaningEn: card.meaningEn,
        gender: card.gender ?? null,
        wordType: card.wordType ?? "other",
        plural: card.plural ?? null,
        ipa: card.ipa ?? null,
        pinyin: card.pinyin ?? null,
        script: unit.script,
        exampleDe: card.exampleDe ?? null,
        exampleId: card.exampleId ?? null,
        exampleEn: card.exampleEn ?? null,
        tags: card.tags ?? [],
        level: card.level ?? unit.sectionId,
        source: "seed",
        suspended: false,
        createdAt: 0,
        updatedAt: 0,
    }));

    cardCache.set(deckId, cards);
    return cards;
}

export function contentCardCount(courseId: string): number {
    return contentUnits
        .filter((unit) => unit.courseId === courseId)
        .reduce((sum, unit) => sum + unit.cardCount, 0);
}
