import type { Card, CardProgress, DeckCycle } from "@/types";
import { emptyCycle } from "@/lib/study/session";

export type PreviousTopicLayout = Record<string, number[]>;

/** Recover the ordered stable ids used by the v5 decks, including id gaps. */
export function previousTopicCards(layout: PreviousTopicLayout): Map<string, string[]> {
    return new Map(Object.entries(layout).map(([deckId, suffixes]) => [deckId,
        suffixes.map((suffix) => `${deckId}-${String(suffix).padStart(4, "0")}`)]));
}

/**
 * Rebuild cycles after cards move between topics, preserving card identities and
 * lifetime history. Known cards stay known; unseen gaps before the cursor are
 * queued, so no vocabulary can be skipped when formerly separate decks merge.
 */
export function reclassifyTopicProgress(
    progress: CardProgress[], cycles: DeckCycle[],
    cards: Pick<Card, "id" | "deckId">[], previous: PreviousTopicLayout,
    now = Date.now(),
): { progress: CardProgress[]; cycles: DeckCycle[]; retiredDeckIds: string[] } {
    const oldCards = previousTopicCards(previous);
    const oldCycles = new Map(cycles.map((cycle) => [cycle.deckId, cycle]));
    const introduced = new Set<string>();
    for (const [deckId, ids] of oldCards) {
        const cycle = oldCycles.get(deckId);
        const cursor = cycle?.topicsV6 ? (cycle.previousTopicCursor ?? 0) : (cycle?.cursor ?? 0);
        for (const id of ids.slice(0, cursor)) introduced.add(id);
    }
    const byId = new Map(progress.map((entry) => [entry.cardId, entry]));
    const byDeck = new Map<string, typeof cards>();
    for (const card of cards) {
        const list = byDeck.get(card.deckId) ?? [];
        list.push(card);
        byDeck.set(card.deckId, list);
    }
    const retiredDeckIds = cycles.filter((cycle) => oldCards.has(cycle.deckId)
        && !byDeck.has(cycle.deckId)).map((cycle) => cycle.deckId);
    const nextCycles = new Map(cycles.filter((cycle) => !retiredDeckIds.includes(cycle.deckId))
        .map((cycle) => [cycle.deckId, cycle]));
    for (const [deckId, deckCards] of byDeck) {
        const old = oldCycles.get(deckId);
        if (old?.topicsV6) continue; // An atomic deck write already completed.
        const ids = deckCards.map((card) => card.id);
        if (old && JSON.stringify(oldCards.get(deckId)) === JSON.stringify(ids)) {
            nextCycles.set(deckId, { ...old, topicsV6: true, previousTopicCursor: old.cursor });
            continue;
        }
        const touched = ids.some((id) => byId.has(id) || introduced.has(id));
        if (!touched && !old) continue;
        const learnedBefore = ids.every((id) => (byId.get(id)?.knownCount ?? 0) > 0);
        const cycleNumber = learnedBefore ? 2 : 1;
        let cursor = 0;
        let knownInCycle = 0;
        let lastActivityAt = old?.lastActivityAt ?? 0;
        for (const [index, id] of ids.entries()) {
            const entry = byId.get(id);
            if (introduced.has(id) || entry) cursor = index + 1;
            if (!entry) continue;
            lastActivityAt = Math.max(lastActivityAt, entry.lastActionAt);
            knownInCycle += Number(entry.known);
            byId.set(id, { ...entry, deckId, cycle: cycleNumber });
        }
        const pendingCardIds = ids.slice(0, cursor).filter((id) => !byId.get(id)?.known);
        nextCycles.set(deckId, {
            ...emptyCycle(deckId, now), topicsV6: true, cycle: cycleNumber, cursor,
            previousTopicCursor: old?.cursor ?? 0,
            knownInCycle, pendingCardIds, lastActivityAt: lastActivityAt || now,
        });
    }
    return { progress: [...byId.values()], cycles: [...nextCycles.values()], retiredDeckIds };
}
