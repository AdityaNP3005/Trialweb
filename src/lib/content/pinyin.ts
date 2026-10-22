const TONE_MARKS: Record<string, number> = {
    "̄": 1,
    "́": 2,
    "̌": 3,
    "̀": 4,
};

/** Tone of one written syllable ("hǎo" → 3); unmarked syllables are neutral (5). */
export function toneOf(syllable: string): number {
    for (const char of syllable.normalize("NFD")) {
        const tone = TONE_MARKS[char];
        if (tone) return tone;
    }
    return 5;
}

/** Pairs every Hanzi with its pinyin syllable; null when they do not line up. */
export function hanziWithTones(
    front: string,
    parts: string[] | null | undefined,
): { char: string; syllable: string | null; tone: number | null }[] {
    let index = 0;
    const aligned = [...front].map((char) => {
        const isHanzi = /\p{Script=Han}/u.test(char);
        const syllable = isHanzi && parts ? (parts[index++] ?? null) : null;
        return { char, syllable, tone: syllable ? toneOf(syllable) : null };
    });
    return parts && index === parts.length ? aligned : [...front].map((char) => ({ char, syllable: null, tone: null }));
}
