import type { CourseDayStat, DailyStat } from "@/types";

export const emptyCourseStat = (): CourseDayStat => ({
    reviews: 0,
    next: 0,
    repeat: 0,
    known: 0,
    studyMs: 0,
    quizCorrect: 0,
    quizTotal: 0,
});

export type CourseActivity = CourseDayStat & { courseId: string };

/**
 * Rolls the per-course counters up over the selected days.
 *
 * Days recorded before per-course counters existed are attributed to
 * `fallbackCourseId` (German), because the app only shipped German back then.
 */
export function courseActivity(
    stats: DailyStat[],
    fallbackCourseId = "de",
): CourseActivity[] {
    const map = new Map<string, CourseDayStat>();

    const add = (courseId: string, entry: CourseDayStat) => {
        const acc = map.get(courseId) ?? emptyCourseStat();
        acc.reviews += entry.reviews ?? 0;
        acc.next += entry.next ?? 0;
        acc.repeat += entry.repeat ?? 0;
        acc.known += entry.known ?? 0;
        acc.studyMs += entry.studyMs ?? 0;
        acc.quizCorrect += entry.quizCorrect ?? 0;
        acc.quizTotal += entry.quizTotal ?? 0;
        map.set(courseId, acc);
    };

    for (const day of stats) {
        const byCourse = day.byCourse ?? {};
        const ids = Object.keys(byCourse);
        const split = emptyCourseStat();

        for (const id of ids) {
            const entry = byCourse[id];
            add(id, entry);
            split.reviews += entry.reviews ?? 0;
            split.next += entry.next ?? 0;
            split.repeat += entry.repeat ?? 0;
            split.known += entry.known ?? 0;
            split.studyMs += entry.studyMs ?? 0;
            split.quizCorrect += entry.quizCorrect ?? 0;
            split.quizTotal += entry.quizTotal ?? 0;
        }

        // A day can mix activity from before the split (no counters) with new
        // answers; keep the remainder visible instead of dropping it.
        const remainder: CourseDayStat = {
            reviews: Math.max(0, day.reviews - split.reviews),
            next: Math.max(0, (day.next ?? 0) - split.next),
            repeat: Math.max(0, (day.repeat ?? 0) - split.repeat),
            known: Math.max(0, (day.known ?? 0) - split.known),
            studyMs: Math.max(0, (day.studyMs ?? 0) - split.studyMs),
            quizCorrect: Math.max(0, (day.quizCorrect ?? 0) - split.quizCorrect),
            quizTotal: Math.max(0, (day.quizTotal ?? 0) - split.quizTotal),
        };
        if (remainder.reviews > 0) {
            add(fallbackCourseId, remainder);
        }
    }

    return [...map.entries()]
        .map(([courseId, value]) => ({ courseId, ...value }))
        .sort((a, b) => b.reviews - a.reviews);
}

/** Replaces each day with the counters of one course (totals stay untouched). */
export function filterStatsByCourse(
    stats: DailyStat[],
    courseId: string | "all",
    fallbackCourseId = "de",
): DailyStat[] {
    if (courseId === "all") return stats;

    return stats.map((day) => {
        const byCourse = day.byCourse ?? {};
        const entry = byCourse[courseId] ?? emptyCourseStat();

        // Only the fallback course can own activity recorded before the split.
        if (courseId !== fallbackCourseId) {
            return {
                ...day,
                reviews: entry.reviews,
                next: entry.next,
                repeat: entry.repeat,
                known: entry.known,
                studyMs: entry.studyMs,
                quizCorrect: entry.quizCorrect,
                quizTotal: entry.quizTotal,
            };
        }

        const split = emptyCourseStat();
        for (const value of Object.values(byCourse)) {
            split.reviews += value.reviews ?? 0;
            split.next += value.next ?? 0;
            split.repeat += value.repeat ?? 0;
            split.known += value.known ?? 0;
            split.studyMs += value.studyMs ?? 0;
            split.quizCorrect += value.quizCorrect ?? 0;
            split.quizTotal += value.quizTotal ?? 0;
        }

        const rest = (total: number | undefined, part: number) =>
            Math.max(0, (total ?? 0) - part);

        return {
            ...day,
            reviews: entry.reviews + rest(day.reviews, split.reviews),
            next: entry.next + rest(day.next, split.next),
            repeat: entry.repeat + rest(day.repeat, split.repeat),
            known: entry.known + rest(day.known, split.known),
            studyMs: entry.studyMs + rest(day.studyMs, split.studyMs),
            quizCorrect: entry.quizCorrect + rest(day.quizCorrect, split.quizCorrect),
            quizTotal: entry.quizTotal + rest(day.quizTotal, split.quizTotal),
        };
    });
}
