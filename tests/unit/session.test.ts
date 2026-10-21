import { describe, expect, it } from "vitest";
import type { Card, DeckCycle } from "@/types";
import {
    buildSession,
    cycleProgress,
    emptyCycle,
    insertRepeat,
    REPEAT_GAP,
} from "@/lib/study/session";

function makeCards(count: number, deckId = "de-a1-core"): Card[] {
    return Array.from({ length: count }, (_, index) => ({
        id: `${deckId}-${String(index + 1).padStart(4, "0")}`,
        deckId,
        courseId: "de",
        front: `Wort ${index + 1}`,
        meaningId: `arti ${index + 1}`,
        meaningEn: `meaning ${index + 1}`,
        gender: null,
        wordType: "other" as const,
        plural: null,
        ipa: null,
        exampleDe: null,
        exampleId: null,
        exampleEn: null,
        tags: [],
        level: "A1" as const,
        source: "seed" as const,
        suspended: false,
        createdAt: 0,
        updatedAt: 0,
    }));
}

function cycleWith(patch: Partial<DeckCycle>): DeckCycle {
    return { ...emptyCycle("de-a1-core"), ...patch };
}

describe("buildSession", () => {
    it("takes sessionSize cards from the cursor and advances it", () => {
        const plan = buildSession({
            deckId: "de-a1-core",
            cards: makeCards(50),
            cycle: emptyCycle("de-a1-core"),
            sessionSize: 10,
        });

        expect(plan.cards).toHaveLength(10);
        expect(plan.cards[0].id).toBe("de-a1-core-0001");
        expect(plan.nextCursor).toBe(10);
        expect(plan.cycle).toBe(1);
        expect(plan.cycleReset).toBe(false);
        expect(plan.remainingInCycle).toBe(40);
        expect(plan.introducedCardIds).toHaveLength(10);
    });

    it("serves pending cards first without moving the cursor", () => {
        const cards = makeCards(30);
        const plan = buildSession({
            deckId: "de-a1-core",
            cards,
            cycle: cycleWith({ cursor: 10, pendingCardIds: [cards[2].id, cards[4].id] }),
            sessionSize: 4,
        });

        expect(plan.cards.map((card) => card.id)).toEqual([
            cards[2].id,
            cards[4].id,
            cards[10].id,
            cards[11].id,
        ]);
        expect(plan.nextCursor).toBe(12);
        expect(plan.pendingLeft).toEqual([cards[2].id, cards[4].id]);
    });

    it("keeps every pending card until it is answered", () => {
        const cards = makeCards(30);
        const plan = buildSession({
            deckId: "de-a1-core",
            cards,
            cycle: cycleWith({ cursor: 30, pendingCardIds: [cards[0].id, cards[1].id] }),
            sessionSize: 1,
        });

        expect(plan.cards).toHaveLength(1);
        expect(plan.pendingLeft).toEqual([cards[0].id, cards[1].id]);
        expect(plan.cycleReset).toBe(false);
    });

    it("resets the cycle once every card was shown and nothing is pending", () => {
        const plan = buildSession({
            deckId: "de-a1-core",
            cards: makeCards(12),
            cycle: cycleWith({ cursor: 12, knownInCycle: 9 }),
            sessionSize: 5,
        });

        expect(plan.cycleReset).toBe(true);
        expect(plan.cycle).toBe(2);
        expect(plan.knownInCycle).toBe(0);
        expect(plan.nextCursor).toBe(5);
        expect(plan.cards[0].id).toBe("de-a1-core-0001");
    });

    it("does not reset while cards are still pending", () => {
        const cards = makeCards(12);
        const plan = buildSession({
            deckId: "de-a1-core",
            cards,
            cycle: cycleWith({ cursor: 12, pendingCardIds: [cards[5].id] }),
            sessionSize: 5,
        });

        expect(plan.cycleReset).toBe(false);
        expect(plan.cards.map((card) => card.id)).toEqual([cards[5].id]);
    });

    it("caps the session at the number of available cards", () => {
        const plan = buildSession({
            deckId: "de-a1-core",
            cards: makeCards(3),
            cycle: emptyCycle("de-a1-core"),
            sessionSize: 20,
        });

        expect(plan.cards).toHaveLength(3);
        expect(plan.nextCursor).toBe(3);
    });

    it("ignores suspended cards", () => {
        const cards = makeCards(5);
        cards[0].suspended = true;

        const plan = buildSession({
            deckId: "de-a1-core",
            cards,
            cycle: emptyCycle("de-a1-core"),
            sessionSize: 3,
        });

        expect(plan.cards.map((card) => card.id)).not.toContain(cards[0].id);
    });
});

describe("insertRepeat", () => {
    it("places the repeated card a few positions later", () => {
        const cards = makeCards(6);
        const queue = insertRepeat(cards, 1, cards[1]);

        expect(queue).toHaveLength(7);
        expect(queue[1 + 1 + REPEAT_GAP].id).toBe(cards[1].id);
        expect(queue.slice(2, 2 + REPEAT_GAP).map((card) => card.id)).not.toContain(
            cards[1].id,
        );
    });

    it("appends when the queue is shorter than the gap", () => {
        const cards = makeCards(2);
        const queue = insertRepeat(cards, 1, cards[1], 5);

        expect(queue).toHaveLength(3);
        expect(queue[2].id).toBe(cards[1].id);
    });
});

describe("cycleProgress", () => {
    it("computes percent and pending from the cycle document", () => {
        const progress = cycleProgress(
            cycleWith({ knownInCycle: 50, pendingCardIds: ["a", "b"] }),
            200,
        );

        expect(progress.percent).toBe(25);
        expect(progress.pending).toBe(2);
        expect(progress.total).toBe(200);
    });

    it("never reports more known cards than the deck has", () => {
        const progress = cycleProgress(cycleWith({ knownInCycle: 999 }), 200);
        expect(progress.known).toBe(200);
        expect(progress.percent).toBe(100);
    });
});
