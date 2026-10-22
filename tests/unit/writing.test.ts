import { describe, expect, it } from "vitest";
import { practiceCharacters } from "@/lib/content/writing";
import type { Card } from "@/types";

const card = (front: string, pinyinParts: string[], meaningId: string) =>
    ({ front, pinyinParts, meaningId, characters: null }) as unknown as Card;

describe("writing practice characters", () => {
    it("lists each Hanzi once, in order, with its own card's meaning and example words", () => {
        const chars = practiceCharacters([
            card("老師", ["lǎo", "shī"], "guru"),
            card("老", ["lǎo"], "tua"),
            card("以...為", ["yǐ", "wéi"], "menganggap"),
        ]);
        expect(chars.map((entry) => entry.char)).toEqual(["老", "師", "以", "為"]);
        expect(chars[0]).toMatchObject({ pinyin: "lǎo", meaning: "tua", words: ["老師"] });
    });
});
