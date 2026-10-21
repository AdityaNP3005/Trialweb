import type { CefrLevel, Deck } from "@/types";
import { contentDecks, loadContentCards } from "@/lib/content/registry";

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
 * Adding a language = add content under `src/content/<id>/`, register the decks
 * in `src/lib/content/registry.ts` and add one entry here.
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

/** Bundled decks exposed as normal `Deck` objects (read-only). */
export function listContentDecks(courseId = defaultCourse.id): Deck[] {
    return contentDecks
        .filter((deck) => deck.courseId === courseId)
        .map((deck) => ({
            id: deck.id,
            courseId: deck.courseId,
            name: deck.name,
            description: deck.description,
            level: deck.level,
            tags: deck.tags,
            cardCount: deck.cardCount,
            source: "content" as const,
            isDefault: deck.level === "A1",
            readOnly: true,
            createdAt: 0,
            updatedAt: 0,
        }));
}

export async function getContentDeckCards(deckId: string) {
    return loadContentCards(deckId);
}
