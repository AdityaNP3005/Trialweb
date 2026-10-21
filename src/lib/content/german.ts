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
