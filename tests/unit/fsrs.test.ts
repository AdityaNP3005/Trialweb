import { describe, expect, it } from "vitest";
import {
    formatInterval,
    newSrsState,
    previewIntervals,
    scheduleReview,
    State,
} from "@/lib/srs/fsrs";

const NOW = new Date("2026-01-01T08:00:00.000Z");

describe("newSrsState", () => {
    it("creates a new card due immediately", () => {
        const srs = newSrsState(NOW.getTime());
        expect(srs.state).toBe(State.New);
        expect(srs.dueMs).toBe(NOW.getTime());
        expect(srs.reps).toBe(0);
        expect(srs.lastReviewMs).toBeNull();
    });
});

describe("scheduleReview", () => {
    it("schedules a Good answer on a new card about 10 minutes out", () => {
        const srs = newSrsState(NOW.getTime());
        const result = scheduleReview(srs, 3, NOW);
        const deltaMinutes = (result.srs.dueMs - NOW.getTime()) / 60_000;

        expect(deltaMinutes).toBeGreaterThan(8);
        expect(deltaMinutes).toBeLessThan(12);
        expect(result.log.rating).toBe(3);
        expect(result.srs.reps).toBe(1);
    });

    it("schedules Again within the learning step", () => {
        const srs = newSrsState(NOW.getTime());
        const result = scheduleReview(srs, 1, NOW);
        const deltaMinutes = (result.srs.dueMs - NOW.getTime()) / 60_000;
        expect(deltaMinutes).toBeLessThanOrEqual(10);
    });

    it("schedules Easy at least a day out", () => {
        const srs = newSrsState(NOW.getTime());
        const result = scheduleReview(srs, 4, NOW);
        expect(result.srs.dueMs - NOW.getTime()).toBeGreaterThanOrEqual(24 * 3_600_000);
    });

    it("never exceeds the configured maximum interval", () => {
        let srs = newSrsState(NOW.getTime());
        let cursor = NOW;
        for (let index = 0; index < 40; index += 1) {
            const result = scheduleReview(srs, 4, cursor);
            srs = result.srs;
            cursor = new Date(Math.min(result.srs.dueMs, cursor.getTime() + 86_400_000));
        }
        expect(srs.scheduledDays).toBeLessThanOrEqual(36_500);
    });
});

describe("previewIntervals", () => {
    it("returns four ratings ordered from hardest to easiest", () => {
        const preview = previewIntervals(newSrsState(NOW.getTime()), NOW);
        expect(Object.keys(preview).map(Number).sort()).toEqual([1, 2, 3, 4]);
        expect(preview[1].dueMs).toBeLessThanOrEqual(preview[3].dueMs);
        expect(preview[3].dueMs).toBeLessThanOrEqual(preview[4].dueMs);
        expect(preview[1].label).toMatch(/^\d+(s|m|h|d|mo|y)$/);
    });
});

describe("formatInterval", () => {
    it("formats common intervals", () => {
        expect(formatInterval(45_000)).toBe("45s");
        expect(formatInterval(10 * 60_000)).toBe("10m");
        expect(formatInterval(3 * 3_600_000)).toBe("3h");
        expect(formatInterval(5 * 86_400_000)).toBe("5d");
        expect(formatInterval(90 * 86_400_000)).toBe("3mo");
        expect(formatInterval(400 * 86_400_000)).toBe("1y");
    });
});
