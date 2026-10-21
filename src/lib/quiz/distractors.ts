export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1));
        [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
}

/** Picks unique wrong answers, never equal to the correct one. */
export function pickDistractors(
    pool: string[],
    correct: string,
    count = 3,
    random: () => number = Math.random,
): string[] {
    const normalized = correct.trim().toLowerCase();
    const unique = [
        ...new Set(pool.map((item) => item.trim()).filter(Boolean)),
    ].filter((item) => item.toLowerCase() !== normalized);

    return shuffle(unique, random).slice(0, count);
}

export function buildOptions(
    correct: string,
    distractors: string[],
    random: () => number = Math.random,
): string[] {
    return shuffle([correct, ...distractors], random);
}

/**
 * Quiz grading maps to an FSRS rating:
 * wrong -> Again, correct -> Good, fast correct -> Easy.
 */
export function ratingForQuiz(correct: boolean, durationMs: number): 1 | 3 | 4 {
    if (!correct) return 1;
    return durationMs < 4000 ? 4 : 3;
}
