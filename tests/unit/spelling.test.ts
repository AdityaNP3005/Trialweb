import { describe, expect, it } from "vitest";
import { editDistance, expectedSpelling, gradeSpelling } from "@/lib/writing/spelling";

describe("spelling practice grading", () => {
    it("asks nouns with their article, other words as written", () => {
        expect(expectedSpelling({ front: "Tisch", gender: "der", wordType: "noun" })).toBe("der Tisch");
        expect(expectedSpelling({ front: "das Brot", gender: "das", wordType: "noun" })).toBe("das Brot");
        expect(expectedSpelling({ front: "schön", gender: null, wordType: "adjective" })).toBe("schön");
    });

    it("separates correct, almost and wrong answers with the reason", () => {
        const verdict = (answer: string, expected: string) => {
            const result = gradeSpelling(answer, expected);
            return [result.verdict, result.issue];
        };
        expect(verdict("der Tisch", "der Tisch")).toEqual(["correct", null]);
        expect(verdict("  der Tisch. ", "der Tisch")).toEqual(["correct", null]);
        expect(verdict("Der Tisch", "der Tisch")).toEqual(["correct", null]);
        expect(verdict("der tisch", "der Tisch")).toEqual(["almost", "case"]);
        expect(verdict("schoen", "schön")).toEqual(["almost", "umlaut"]);
        expect(verdict("Strasse", "Straße")).toEqual(["almost", "umlaut"]);
        expect(verdict("Tisch", "der Tisch")).toEqual(["almost", "article-missing"]);
        expect(verdict("die Tisch", "der Tisch")).toEqual(["almost", "article-wrong"]);
        expect(verdict("Entschuldigun", "Entschuldigung")).toEqual(["almost", "typo"]);
        expect(verdict("Haus", "der Tisch")).toEqual(["wrong", null]);
        expect(verdict("", "der Tisch")).toEqual(["wrong", null]);
    });

    it("computes edit distance", () => {
        expect(editDistance("kitten", "sitting")).toBe(3);
        expect(editDistance("", "abc")).toBe(3);
    });
});
