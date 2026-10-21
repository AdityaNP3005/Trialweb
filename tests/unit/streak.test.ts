import { describe, expect, it } from "vitest";
import { computeStreak } from "@/lib/stats/streak";

const day = (date: string, reviews = 1) => ({ date, reviews });

describe("computeStreak", () => {
    const today = new Date("2026-03-10T12:00:00");

    it("counts consecutive days including today", () => {
        const result = computeStreak(
            [day("2026-03-08"), day("2026-03-09"), day("2026-03-10")],
            today,
        );
        expect(result.current).toBe(3);
        expect(result.longest).toBe(3);
    });

    it("keeps the streak alive when today has no reviews yet", () => {
        const result = computeStreak(
            [day("2026-03-08"), day("2026-03-09")],
            today,
        );
        expect(result.current).toBe(2);
    });

    it("resets when the last activity was two days ago", () => {
        const result = computeStreak([day("2026-03-08")], today);
        expect(result.current).toBe(0);
    });

    it("ignores days without reviews and finds the longest run", () => {
        const result = computeStreak(
            [
                day("2026-02-01"),
                day("2026-02-02"),
                day("2026-02-03"),
                day("2026-02-04"),
                day("2026-02-10", 0),
                day("2026-03-09"),
            ],
            today,
        );
        expect(result.current).toBe(1);
        expect(result.longest).toBe(4);
    });
});
