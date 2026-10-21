import { describe, expect, it } from "vitest";
import {
    buildOptions,
    pickDistractors,
    ratingForQuiz,
    shuffle,
} from "@/lib/quiz/distractors";

/** Deterministic PRNG so option order is testable. */
function seeded(seed: number) {
    let value = seed;
    return () => {
        value = (value * 1664525 + 1013904223) % 4294967296;
        return value / 4294967296;
    };
}

describe("pickDistractors", () => {
    it("never returns the correct answer and never duplicates", () => {
        const pool = ["apel", "apel", "roti", "susu", "keju", "gula"];
        const result = pickDistractors(pool, "apel", 3, seeded(7));
        expect(result).toHaveLength(3);
        expect(result).not.toContain("apel");
        expect(new Set(result).size).toBe(3);
    });

    it("returns fewer items when the pool is small", () => {
        const result = pickDistractors(["apel", "roti"], "apel", 3, seeded(1));
        expect(result).toEqual(["roti"]);
    });
});

describe("buildOptions", () => {
    it("always includes the correct answer exactly once", () => {
        const options = buildOptions("apel", ["roti", "susu", "keju"], seeded(3));
        expect(options).toHaveLength(4);
        expect(options.filter((option) => option === "apel")).toHaveLength(1);
    });
});

describe("shuffle", () => {
    it("keeps all items", () => {
        const input = [1, 2, 3, 4, 5];
        const output = shuffle(input, seeded(9));
        expect([...output].sort()).toEqual(input);
        expect(input).toEqual([1, 2, 3, 4, 5]);
    });
});

describe("ratingForQuiz", () => {
    it("maps wrong answers to Again", () => {
        expect(ratingForQuiz(false, 1000)).toBe(1);
    });

    it("maps correct answers to Good or Easy by speed", () => {
        expect(ratingForQuiz(true, 9000)).toBe(3);
        expect(ratingForQuiz(true, 1500)).toBe(4);
    });
});
