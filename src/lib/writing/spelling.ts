import type { Card } from "@/types";

export type SpellingVerdict = "correct" | "almost" | "wrong";

/** Why an answer is only "almost" right; shown as a hint after checking. */
export type SpellingIssue = "case" | "umlaut" | "article-missing" | "article-wrong" | "typo";

export type SpellingResult = {
    verdict: SpellingVerdict;
    issue: SpellingIssue | null;
    expected: string;
};

const ARTICLE = /^(der|die|das)\s+/i;

/** The answer a learner must type: nouns include their article ("der Tisch"). */
export function expectedSpelling(card: Pick<Card, "front" | "gender" | "wordType">): string {
    if (card.wordType === "noun" && card.gender && !ARTICLE.test(card.front)) {
        return `${card.gender} ${card.front}`;
    }
    return card.front;
}

function clean(text: string): string {
    return text.normalize("NFC").trim().replace(/\s+/g, " ").replace(/[.!?,;:]+$/, "");
}

/** ä→ae, ö→oe, ü→ue, ß→ss: how German is typed without umlaut keys. */
function transliterate(text: string): string {
    return text.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae")
        .replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss");
}

export function editDistance(a: string, b: string): number {
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
        let diagonal = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j += 1) {
            const above = row[j];
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
            diagonal = above;
        }
    }
    return row[b.length];
}

/**
 * Grades a typed German word. Exact (case-sensitive) is correct; capitalisation,
 * umlaut transliteration, article problems and one or two typos are "almost".
 */
export function gradeSpelling(answer: string, expected: string): SpellingResult {
    // "Der Tisch" is fine on its own: an article may start with a capital.
    const given = clean(answer).replace(/^(Der|Die|Das) /, (article) => article.toLowerCase());
    const target = clean(expected);
    const result = (verdict: SpellingVerdict, issue: SpellingIssue | null) => ({ verdict, issue, expected: target });

    if (given === target) return result("correct", null);
    if (given.toLowerCase() === target.toLowerCase()) return result("almost", "case");
    if (transliterate(target).toLowerCase() === transliterate(given).toLowerCase()) return result("almost", "umlaut");

    const targetArticle = ARTICLE.exec(target);
    if (targetArticle) {
        const word = target.slice(targetArticle[0].length);
        const givenWord = given.replace(ARTICLE, "");
        if (givenWord === word) {
            return result("almost", ARTICLE.test(given) ? "article-wrong" : "article-missing");
        }
    }

    const limit = target.length > 8 ? 2 : 1;
    if (editDistance(given.toLowerCase(), target.toLowerCase()) <= limit) return result("almost", "typo");
    return result("wrong", null);
}

/** Points per verdict for the session score. */
export const SPELLING_POINTS: Record<SpellingVerdict, number> = { correct: 1, almost: 0.5, wrong: 0 };
