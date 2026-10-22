import type { Card } from "@/types";
import { hanziWithTones } from "@/lib/content/pinyin";

export type PracticeChar = {
    char: string;
    pinyin: string | null;
    meaning: string | null;
    /** Up to three words of the chapter that contain the character. */
    words: string[];
};

/** Unique Hanzi of a chapter in order of first appearance, with a gloss. */
export function practiceCharacters(cards: Card[]): PracticeChar[] {
    const byChar = new Map<string, PracticeChar>();
    for (const card of cards) {
        for (const { char, syllable } of hanziWithTones(card.front, card.pinyinParts)) {
            if (!/\p{Script=Han}/u.test(char)) continue;
            const entry = byChar.get(char) ?? { char, pinyin: syllable, meaning: null, words: [] };
            const own = card.front === char ? card.meaningId : null;
            const part = card.characters?.find((info) => info.char === char);
            entry.meaning ??= own ?? part?.meaningId ?? part?.meaningEn ?? null;
            entry.pinyin ??= syllable;
            if (card.front !== char && entry.words.length < 3 && !entry.words.includes(card.front)) {
                entry.words.push(card.front);
            }
            byChar.set(char, entry);
        }
    }
    return [...byChar.values()];
}
