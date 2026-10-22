import type { Card, Gender } from "@/types";

/** One card per German headword, including articles, case and spelling variants. */
const spellingVariants: Record<string, string> = {
    "tschüs": "tschüss", email: "e-mail", photo: "foto",
    photographie: "fotografie", photograph: "fotograf",
    geographie: "geografie", phantasie: "fantasie", telephon: "telefon",
    jogurt: "joghurt", portmonee: "portemonnaie", saxofon: "saxophon",
    "majonäse": "mayonnaise",
};

export function germanHeadword(front: string): string {
    const word = front.normalize("NFC").toLowerCase().trim()
        .replace(/^(der|die|das)\s+/, "")
        .replace(/\s+/g, " ").replace(/[.,!?;:]+$/, "");
    return spellingVariants[word] ?? word;
}

/** Splits a noun front into its article and word; curated fronts already carry it. */
export function frontParts(card: Pick<Card, "front" | "gender">): { article: Gender | null; word: string } {
    const match = /^(der|die|das)\s+(.+)$/.exec(card.front);
    if (match) return { article: match[1] as Gender, word: match[2] };
    return { article: card.gender ?? null, word: card.front };
}

/** Text to speak: the noun with its article, so the article is learned with it. */
export function spokenFront(card: Pick<Card, "front" | "gender">): string {
    const { article, word } = frontParts(card);
    return article ? `${article} ${word}` : word;
}
