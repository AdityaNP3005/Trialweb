import type { Card } from "@/types";

/** Lowercase, no diacritics or pinyin tone marks, ß → ss, single spaces. */
export function foldText(text: string | null | undefined): string {
    return (text ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/ß/g, "ss")
        .replace(/\s+/g, " ")
        .trim();
}

type Searchable = Pick<Card, "front" | "meaningId" | "meaningEn" | "pinyin">;

/**
 * Score of one card for a folded query; 0 means no match. The word itself
 * outranks its meanings, and whole-word hits outrank substrings.
 */
export function scoreCard(card: Searchable, query: string): number {
    if (!query) return 0;
    const front = foldText(card.front).replace(/^(der|die|das) /, "");
    const pinyin = foldText(card.pinyin);
    const compactQuery = query.replace(/ /g, "");

    if (front === query || pinyin === query || pinyin.replace(/ /g, "") === compactQuery) return 100;
    if (front.startsWith(query) || pinyin.startsWith(query)) return 80;
    // Inside another word ("guru" in "Känguru") ranks below a meaning that is the word.
    let best = front.includes(query) || pinyin.replace(/ /g, "").includes(compactQuery) ? 40 : 0;
    for (const meaning of [card.meaningId, card.meaningEn]) {
        const folded = foldText(meaning);
        if (!folded.includes(query)) continue;
        const words = folded.split(/[^\p{L}\p{N}]+/u);
        best = Math.max(best, words.includes(query) ? 50 : 30);
    }
    return best;
}

/** Best matches first; ties keep content order (band/book, then topic). */
export function searchCards<T extends Searchable>(cards: T[], rawQuery: string, limit = 60): T[] {
    const query = foldText(rawQuery);
    if (!query) return [];
    return cards
        .map((card, index) => ({ card, index, score: scoreCard(card, query) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .slice(0, limit)
        .map((entry) => entry.card);
}
