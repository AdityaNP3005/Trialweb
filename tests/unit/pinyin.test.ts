import { describe, expect, it } from "vitest";
import { hanziWithTones, toneOf } from "@/lib/content/pinyin";

describe("pinyin tones", () => {
    it("reads the tone mark of a syllable", () => {
        expect(["mā", "má", "mǎ", "mà", "ma", "lǜ"].map(toneOf)).toEqual([1, 2, 3, 4, 5, 4]);
    });

    it("aligns syllables with Hanzi and skips punctuation", () => {
        const aligned = hanziWithTones("以...為", ["yǐ", "wéi"]);
        expect(aligned.map((entry) => entry.tone)).toEqual([3, null, null, null, 2]);
    });

    it("gives no tones when the syllables do not line up", () => {
        expect(hanziWithTones("客廳", ["kè"]).every((entry) => entry.tone === null)).toBe(true);
    });
});
