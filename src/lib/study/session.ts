import type { Card, DeckCycle } from "@/types";

/** How many other cards are shown before a repeated card comes back. */
export const REPEAT_GAP = 3;
/** Safety valve so a card cannot loop forever inside one session. */
export const MAX_REPEATS_PER_CARD = 5;

export type SessionPlan = {
    deckId: string;
    /** Cycle the session runs in (already incremented when resetting). */
    cycle: number;
    /** True when this session starts a brand-new cycle. */
    cycleReset: boolean;
    /** Initial card order for the session. */
    cards: Card[];
    /** Cards that advance the deck cursor (first time seen this cycle). */
    introducedCardIds: string[];
    /** Cursor value to persist after the session is built. */
    nextCursor: number;
    knownInCycle: number;
    pendingLeft: string[];
    /** Cards left in the deck that this cycle has not introduced yet. */
    remainingInCycle: number;
};

export function emptyCycle(deckId: string, now = Date.now()): DeckCycle {
    return {
        deckId,
        cycle: 1,
        cursor: 0,
        knownInCycle: 0,
        pendingCardIds: [],
        startedAt: now,
        completedAt: null,
        lastActivityAt: now,
    };
}

function shuffleInPlace<T>(items: T[]): T[] {
    for (let index = items.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(Math.random() * (index + 1));
        [items[index], items[swap]] = [items[swap], items[index]];
    }
    return items;
}

/**
 * Builds one session for a deck.
 *
 * Rules (see plan):
 * 1. Cards that still need another pass ("pending") come first.
 * 2. The rest is taken in deck order from the cursor, up to `sessionSize`.
 * 3. When the cursor reached the end and nothing is pending, the cycle is
 *    reset: every card becomes unseen again (cycle + 1, cursor 0).
 */
export function buildSession(input: {
    deckId: string;
    cards: Card[];
    cycle: DeckCycle;
    sessionSize: number;
    shuffle?: boolean;
}): SessionPlan {
    const { deckId, sessionSize } = input;
    const cards = input.cards.filter((card) => !card.suspended);
    const total = cards.length;
    const byId = new Map(cards.map((card) => [card.id, card]));
    const size = Math.max(1, Math.min(Math.round(sessionSize) || 1, total || 1));

    let cycle = input.cycle.cycle;
    let cursor = Math.min(Math.max(0, input.cycle.cursor), total);
    let knownInCycle = input.cycle.knownInCycle;
    let cycleReset = false;

    const pending = input.cycle.pendingCardIds.filter((id) => byId.has(id));
    const chosen: Card[] = pending
        .slice(0, size)
        .map((id) => byId.get(id)!)
        .filter(Boolean);
    // Pending cards stay pending until they are answered with "next"; building
    // a session must not remove them (the user may leave before answering).
    const pendingLeft = pending;

    const introduced: Card[] = [];
    while (chosen.length + introduced.length < size && cursor + introduced.length < total) {
        introduced.push(cards[cursor + introduced.length]);
    }

    if (chosen.length + introduced.length === 0) {
        cycleReset = true;
        cycle += 1;
        cursor = 0;
        knownInCycle = 0;
        while (introduced.length < size && introduced.length < total) {
            introduced.push(cards[introduced.length]);
        }
    }

    const queue = [...chosen, ...introduced];
    if (input.shuffle) {
        // Pending cards stay first so they are not skipped, the fresh part is mixed.
        const mixed = shuffleInPlace(introduced.slice());
        queue.splice(chosen.length, mixed.length, ...mixed);
    }

    const nextCursor = cursor + introduced.length;

    return {
        deckId,
        cycle,
        cycleReset,
        cards: queue,
        introducedCardIds: introduced.map((card) => card.id),
        nextCursor,
        knownInCycle,
        pendingLeft,
        remainingInCycle: Math.max(0, total - nextCursor),
    };
}

/** Places a repeated card a few positions later inside the running queue. */
export function insertRepeat(
    queue: Card[],
    currentIndex: number,
    card: Card,
    gap = REPEAT_GAP,
): Card[] {
    const next = queue.slice();
    const at = Math.min(currentIndex + 1 + Math.max(1, gap), next.length);
    next.splice(at, 0, card);
    return next;
}

/** Aggregated progress for one deck, derived from cycle + total card count. */
export function cycleProgress(cycle: DeckCycle | null, total: number) {
    const resolved = cycle ?? { cycle: 1, knownInCycle: 0, pendingCardIds: [], lastActivityAt: null };
    const known = Math.max(0, Math.min(total, resolved.knownInCycle));
    return {
        cycle: resolved.cycle,
        known,
        total,
        pending: resolved.pendingCardIds.length,
        percent: total > 0 ? Math.min(100, Math.round((known / total) * 100)) : 0,
        lastActivityAt: resolved.lastActivityAt,
    };
}
