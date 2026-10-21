import { describe, expect, it } from "vitest";
import type { DailyStat } from "@/types";
import { courseActivity, filterStatsByCourse } from "@/lib/stats/course-stats";

const base = (date: string): DailyStat => ({
    date,
    reviews: 0,
    next: 0,
    repeat: 0,
    known: 0,
    studyMs: 0,
    quizCorrect: 0,
    quizTotal: 0,
});

const counters = (reviews: number, known: number, studyMs: number) => ({
    reviews,
    next: known,
    repeat: reviews - known,
    known,
    studyMs,
    quizCorrect: 0,
    quizTotal: 0,
});

describe("course activity", () => {
    it("splits one day into languages while keeping the totals", () => {
        const day: DailyStat = {
            ...base("2026-10-21"),
            reviews: 30,
            next: 20,
            repeat: 10,
            known: 20,
            studyMs: 60_000,
            byCourse: {
                de: counters(10, 8, 20_000),
                zh: counters(20, 12, 40_000),
            },
        };

        const activity = courseActivity([day]);

        expect(activity).toHaveLength(2);
        expect(activity[0]).toMatchObject({ courseId: "zh", reviews: 20, known: 12 });
        expect(activity[1]).toMatchObject({ courseId: "de", reviews: 10, known: 8 });
        // Totals are untouched.
        expect(day.reviews).toBe(30);
    });

    it("attributes days recorded before the split to German", () => {
        const legacy: DailyStat = {
            ...base("2026-10-01"),
            reviews: 12,
            known: 7,
            studyMs: 30_000,
        };

        const activity = courseActivity([legacy]);

        expect(activity).toEqual([
            expect.objectContaining({ courseId: "de", reviews: 12, known: 7 }),
        ]);
    });

    it("keeps the unsplit part of a mixed day", () => {
        // 5 answers from before the split + 1 new Mandarin answer on the same day.
        const mixed: DailyStat = {
            ...base("2026-10-21"),
            reviews: 6,
            known: 4,
            byCourse: { zh: counters(1, 1, 0) },
        };

        const activity = courseActivity([mixed]);
        const zh = activity.find((entry) => entry.courseId === "zh");
        const de = activity.find((entry) => entry.courseId === "de");

        expect(zh?.reviews).toBe(1);
        expect(de?.reviews).toBe(5);
        expect(de?.known).toBe(3);
    });

    it("filters the daily series to one course", () => {
        const days: DailyStat[] = [
            {
                ...base("2026-10-20"),
                reviews: 5,
                known: 3,
                byCourse: { de: counters(5, 3, 10_000) },
            },
            {
                ...base("2026-10-21"),
                reviews: 9,
                known: 4,
                byCourse: { zh: counters(9, 4, 20_000) },
            },
        ];

        const zh = filterStatsByCourse(days, "zh");
        expect(zh.map((day) => day.reviews)).toEqual([0, 9]);
        expect(zh.map((day) => day.known)).toEqual([0, 4]);

        const de = filterStatsByCourse(days, "de");
        expect(de.map((day) => day.reviews)).toEqual([5, 0]);

        expect(filterStatsByCourse(days, "all")).toBe(days);
    });
});
