import type { Card, CardProgress, DeckCycle } from "@/types";
import { emptyCycle } from "@/lib/study/session";

/** Consolidate duplicate-card history and adjust positional cursors once. */
export function consolidateReviewedProgress(
    progress: CardProgress[],
    cycles: DeckCycle[],
    cards: Pick<Card, "id" | "deckId">[],
    aliases: Record<string, string>,
): { progress: CardProgress[]; cycles: DeckCycle[] } {
    const byId = new Map(cards.map((card) => [card.id, card]));
    const byDeck = new Map<string, typeof cards>();
    for (const card of cards) {
        const list = byDeck.get(card.deckId) ?? [];
        list.push(card);
        byDeck.set(card.deckId, list);
    }
    const cycleMap = new Map(cycles.map((cycle) => [cycle.deckId, cycle]));
    const groups = new Map<string, CardProgress[]>();
    for (const entry of progress) {
        const target = aliases[entry.cardId] ?? entry.cardId;
        const group = groups.get(target) ?? [];
        group.push(entry);
        groups.set(target, group);
    }
    const pendingMoved = new Map<string, string[]>();
    const result: CardProgress[] = [];
    for (const [id, group] of groups) {
        // An existing survivor's current-cycle state takes priority; duplicate
        // histories still contribute lifetime counters without double counting.
        const canonical = group.find((entry) => entry.cardId === id);
        const latest = group.reduce((a, b) => a.lastActionAt >= b.lastActionAt ? a : b);
        const card = byId.get(id);
        if (!card) {
            result.push(...group);
            continue;
        }
        const chosen = canonical ?? latest;
        const moved = !canonical;
        const cycle = cycleMap.get(card.deckId) ?? emptyCycle(card.deckId, latest.lastActionAt);
        cycleMap.set(card.deckId, cycle);
        result.push({
            ...chosen, cardId: id, deckId: card.deckId,
            cycle: moved ? cycle.cycle : chosen.cycle,
            known: moved ? false : chosen.known,
            totalRepeats: Math.max(...group.map((entry) => entry.totalRepeats)),
            knownCount: Math.max(...group.map((entry) => entry.knownCount)),
            lastSeenAt: Math.max(...group.map((entry) => entry.lastSeenAt ?? 0)),
            lastActionAt: Math.max(...group.map((entry) => entry.lastActionAt)),
        });
        if (moved) {
            const pending = pendingMoved.get(card.deckId) ?? [];
            pending.push(id);
            pendingMoved.set(card.deckId, pending);
        }
    }
    const reviewedCycles = [...cycleMap.values()].map((cycle) => {
        const deckCards = byDeck.get(cycle.deckId);
        if (!deckCards) return cycle; // Custom decks and Mandarin are untouched.
        const pending = [...cycle.pendingCardIds.map((id) => aliases[id] ?? id),
            ...(pendingMoved.get(cycle.deckId) ?? []),
            ...result.filter((entry) => entry.deckId === cycle.deckId
                && entry.cycle === cycle.cycle && !entry.known).map((entry) => entry.cardId)];
        return {
            ...cycle,
            vocabV5: true,
            // Explicit ids retain their original topic position even after gaps
            // are removed. A retry must not convert the cursor a second time.
            cursor: cycle.vocabV5 ? cycle.cursor : deckCards.filter(
                (card) => Number(card.id.slice(-4)) <= cycle.cursor,
            ).length,
            knownInCycle: result.filter((entry) => entry.deckId === cycle.deckId
                && entry.cycle === cycle.cycle && entry.known).length,
            pendingCardIds: [...new Set(pending)].filter((id) => byId.get(id)?.deckId === cycle.deckId),
        };
    });
    return { progress: result, cycles: reviewedCycles };
}

export async function loadReviewedGermanCards(layout: "current" | "v5" = "current") {
    const { contentTopics, loadContentCards } = await import("@/lib/content/registry");
    const cards = (await Promise.all(contentTopics.map((topic) => loadContentCards(topic.id)))).flat();
    if (layout === "current") return cards;
    // The vocabulary migration must finish against its original deck layout
    // before the semantic-topic migration runs, including for older accounts.
    const snapshot = (await import("@/content/topic-map-v6.json")).default;
    const oldDeckById = new Map<string, string>(Object.entries(snapshot.fromDecks).flatMap(
        ([deckId, suffixes]) => suffixes.map((suffix) => [`${deckId}-${String(suffix).padStart(4, "0")}`, deckId] as const),
    ));
    return cards.map((card) => ({ ...card, deckId: oldDeckById.get(card.id) ?? card.deckId }));
}
