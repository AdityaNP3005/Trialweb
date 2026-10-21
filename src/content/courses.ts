import type { CefrLevel } from "@/types";

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
 * Adding a language = add content under `src/content/<id>/` and one entry here.
 * The Firestore schema is already course-agnostic (`courseId` on every deck).
 */
export const courses: Course[] = [
    {
        id: "de",
        name: "German",
        nativeName: "Deutsch",
        flag: "🇩🇪",
        speechLocale: "de-DE",
        levels: ["A1", "A2", "B1"],
        enabled: true,
    },
];

export const defaultCourse = courses.find((course) => course.enabled) ?? courses[0];

export function getCourse(id: string | null | undefined): Course {
    return courses.find((course) => course.id === id) ?? defaultCourse;
}
