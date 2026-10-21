import type {
    CefrLevel,
    Deck,
    LevelSetting,
    DeckProgress,
    BandSettings,
} from "@/types";
import { CEFR_LEVELS } from "@/types";

export const DEFAULT_SESSION_SIZE = 20;
export const MIN_SESSION_SIZE = 5;
export const MAX_SESSION_SIZE = 100;

export function defaultBands(): BandSettings {
    const entries = CEFR_LEVELS.map((level) => [
        level,
        { sessionSize: DEFAULT_SESSION_SIZE, shuffle: false } satisfies LevelSetting,
    ]);
    return Object.fromEntries(entries) as BandSettings;
}

/** Fills gaps in profiles written before band settings existed. */
export function normalizeBands(
    bands: Partial<Record<CefrLevel, Partial<LevelSetting>>> | null | undefined,
): BandSettings {
    const base = defaultBands();
    if (!bands) return base;

    for (const level of CEFR_LEVELS) {
        const entry = bands[level];
        if (!entry) continue;
        const size = Number(entry.sessionSize);
        base[level] = {
            sessionSize: Number.isFinite(size)
                ? Math.min(MAX_SESSION_SIZE, Math.max(MIN_SESSION_SIZE, Math.round(size)))
                : DEFAULT_SESSION_SIZE,
            shuffle: Boolean(entry.shuffle),
        };
    }
    return base;
}

export function emptyProgress(
    deckId: string,
    level: CefrLevel,
    total: number,
): DeckProgress {
    return {
        deckId,
        level,
        cycle: 1,
        known: 0,
        total,
        pending: 0,
        percent: 0,
        lastActivityAt: null,
    };
}

export function progressPercent(known: number, total: number): number {
    if (total <= 0) return 0;
    return Math.min(100, Math.round((known / total) * 100));
}

export function isContentDeck(deck: Deck): boolean {
    return deck.source === "content";
}
