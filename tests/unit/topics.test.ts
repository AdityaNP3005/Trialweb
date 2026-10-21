import { describe, expect, it } from "vitest";
import manifest from "@/content/manifest.json";
import migration from "@/content/migration-map.json";
import topicMap from "@/content/topic-map.json";
import aliases from "@/content/de/review-aliases.json";
import { loadReviewedGermanCards } from "@/lib/content/review-progress";
import { summarizeBand } from "@/content/courses";
import { getContentDeck, topicsForLevel } from "@/lib/content/registry";
import type { Deck, DeckProgress } from "@/types";

function deck(id: string, level: Deck["level"], order: number, cardCount: number): Deck {
    return {
        id,
        courseId: "de",
        name: id,
        description: "",
        level,
        tags: [],
        cardCount,
        source: "content",
        isDefault: false,
        readOnly: true,
        topicOrder: order,
        createdAt: 0,
        updatedAt: 0,
    };
}

function progress(
    deckId: string,
    level: Deck["level"],
    known: number,
    total: number,
    cycle = 1,
): DeckProgress {
    return {
        deckId,
        level,
        cycle,
        known,
        total,
        pending: 0,
        percent: total > 0 ? Math.round((known / total) * 100) : 0,
        lastActivityAt: 1,
    };
}

describe("summarizeBand", () => {
    it("rolls up topics of one band only", () => {
        const decks = [
            deck("de-a1-one", "A1", 1, 40),
            deck("de-a1-two", "A1", 2, 60),
            deck("de-a2-one", "A2", 1, 100),
        ];
        const byId = new Map([
            ["de-a1-one", progress("de-a1-one", "A1", 40, 40)],
            ["de-a1-two", progress("de-a1-two", "A1", 20, 60)],
            ["de-a2-one", progress("de-a2-one", "A2", 0, 100)],
        ]);

        const summary = summarizeBand("A1", decks, byId);

        expect(summary.topics).toBe(2);
        expect(summary.total).toBe(100);
        expect(summary.known).toBe(60);
        // Percent follows completed units, not the running cycle's cards.
        expect(summary.percent).toBe(50);
        expect(summary.topicsDone).toBe(1);
        expect(summary.nextTopic?.id).toBe("de-a1-two");
    });

    it("keeps a finished topic done after the cycle resets", () => {
        const decks = [
            deck("zh-book1-l01", "book1", 1, 40),
            deck("zh-book1-l02", "book1", 2, 33),
        ];
        const byId = new Map([
            // Cycle 2 means the learner finished one full cycle already;
            // knownInCycle is back to 0.
            ["zh-book1-l01", progress("zh-book1-l01", "book1", 0, 40, 2)],
            ["zh-book1-l02", progress("zh-book1-l02", "book1", 0, 33, 1)],
        ]);

        const summary = summarizeBand("book1", decks, byId);

        expect(summary.topicsDone).toBe(1);
        expect(summary.percent).toBe(50);
        expect(summary.nextTopic?.id).toBe("zh-book1-l02");
    });

    it("falls back to the first topic when everything is done", () => {
        const decks = [deck("de-a1-one", "A1", 1, 10)];
        const byId = new Map([["de-a1-one", progress("de-a1-one", "A1", 10, 10)]]);

        const summary = summarizeBand("A1", decks, byId);

        expect(summary.topicsDone).toBe(1);
        expect(summary.nextTopic?.id).toBe("de-a1-one");
    });
});

describe("topic manifest", () => {
    it("ships every band with ordered topics", () => {
        expect(manifest.version).toBe(2);
        expect(manifest.levels.map((level) => level.level)).toEqual([
            "A1",
            "A2",
            "B1",
            "B2",
            "C1",
            "C2",
        ]);

        for (const level of manifest.levels) {
            const orders = level.topics.map((topic) => topic.order);
            expect(orders).toEqual([...orders].sort((a, b) => a - b));
            expect(new Set(orders).size).toBe(orders.length);
            expect(level.topics.length).toBeGreaterThan(5);
        }
    });

    it("resolves every topic id to cards", () => {
        for (const level of manifest.levels) {
            for (const topic of level.topics) {
                const resolved = getContentDeck(topic.id);
                expect(resolved?.level).toBe(level.level);
                expect(topic.cardCount).toBeGreaterThan(0);
            }
            expect(topicsForLevel(level.level as Deck["level"]).length).toBe(
                level.topics.length,
            );
        }
    });
});

describe("migration map", () => {
    it("resolves retained core-card histories through the historical topic and duplicate maps", async () => {
        const entries = Object.entries(migration);
        const cards = new Map((await loadReviewedGermanCards()).map((card) => [card.id, card]));
        expect(entries.length).toBeGreaterThan(9000);

        for (const [oldId, newId] of entries) {
            expect(oldId).toMatch(/^de-[a-z0-9]+-core-\d{4}$/);
            const target = topicMap[newId as keyof typeof topicMap];
            // Earlier releases deliberately retired names/trimmed candidates
            // absent from the v3→v4 map; the migration has always skipped them.
            if (!target) continue;
            const current = aliases[target as keyof typeof aliases] ?? target;
            expect(cards.has(current), `${current} has no bundled card`).toBe(true);
        }
    });

    it("maps every previous topic-card id to an existing card independent of its current deck", async () => {
        const entries = Object.entries(topicMap);
        const cards = new Map((await loadReviewedGermanCards()).map((card) => [card.id, card]));
        expect(entries.length).toBeGreaterThan(9000);

        for (const [oldId, newId] of entries) {
            expect(oldId).toMatch(/^de-[a-z0-9-]+-\d{4}$/);
            const current = aliases[newId as keyof typeof aliases] ?? newId;
            const card = cards.get(current);
            expect(card, `${current} has no bundled card`).toBeDefined();
            expect(getContentDeck(card!.deckId)).not.toBeNull();
        }
    });
});
