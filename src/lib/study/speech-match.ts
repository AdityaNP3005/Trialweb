import type { Card } from "@/types";
import { foldText } from "@/lib/content/search";
import { frontParts } from "@/lib/content/german";

export type SpeechVerdict = "match" | "close" | "miss";

/** Letters, digits and single spaces, so "Hallo!" and "hallo" compare equal. */
function clean(text: string): string {
    return foldText(text).replace(/[^\p{L}\p{N} ]/gu, "").trim();
}

function levenshtein(a: string, b: string): number {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        let diagonal = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const above = row[j];
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
            diagonal = above;
        }
    }
    return row[b.length];
}

function similarity(a: string, b: string): number {
    if (!a || !b) return 0;
    return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

/**
 * Grades what the browser heard against the card. Recognisers return several
 * alternatives and may drop or add the German article, so the best of all
 * pairs counts. shortcut: compares text, not tones or sounds; a Hanzi word
 * heard as a homophone in other characters counts as a miss.
 */
export function gradeSpeech(
    heard: string[],
    card: Pick<Card, "front" | "gender" | "script">,
): { verdict: SpeechVerdict; best: string } {
    const { article, word } = frontParts(card);
    const targets = [word, article ? `${article} ${word}` : ""].map(clean).filter(Boolean);

    let score = 0;
    let best = heard[0] ?? "";
    for (const alternative of heard) {
        const said = clean(alternative);
        for (const target of targets) {
            // The word inside a longer phrase ("ja" in "ja bitte") is still a hit;
            // Hanzi has no spaces, Latin needs whole words ("Haus" ≠ "Hausaufgabe").
            const inside = card.script === "hanzi" ? said.includes(target) : ` ${said} `.includes(` ${target} `);
            const value = inside ? 1 : similarity(said.replace(/ /g, ""), target.replace(/ /g, ""));
            if (value > score) {
                score = value;
                best = alternative;
            }
        }
    }

    const verdict = score >= 0.999 ? "match" : score >= (card.script === "hanzi" ? 0.5 : 0.75) ? "close" : "miss";
    return { verdict, best };
}
