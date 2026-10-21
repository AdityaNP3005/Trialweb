import { describe, expect, it } from "vitest";
import manifest from "@/content/manifest.json";
import migration from "@/content/migration-map.json";
import topicMap from "@/content/topic-map.json";
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

function progress(deckId: string, level: Deck["level"], known: number, total: number): DeckProgress {
    return {
        deckId,
        level,
        cycle: 1,
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
        expect(summary.percent).toBe(60);
        expect(summary.topicsDone).toBe(1);
        expect(summary.nextTopic?.id).toBe("de-a1-two");
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
    it("maps every old per-level card to an existing topic card", () => {
        const entries = Object.entries(migration);
        expect(entries.length).toBeGreaterThan(9000);

        for (const [oldId, newId] of entries.slice(0, 500)) {
            expect(oldId).toMatch(/^de-[a-z0-9]+-core-\d{4}$/);
            const target = topicMap[newId as keyof typeof topicMap] ?? newId;
            const deckId = target.replace(/-\d{4}$/, "");
            expect(getContentDeck(deckId), `${target} has no topic`).not.toBeNull();
        }
    });

    it("maps the previous topic ids to the current ones", () => {
        const entries = Object.entries(topicMap);
        expect(entries.length).toBeGreaterThan(9000);

        for (const [oldId, newId] of entries.slice(0, 500)) {
            expect(oldId).toMatch(/^de-[a-z0-9-]+-\d{4}$/);
            const deckId = newId.replace(/-\d{4}$/, "");
            expect(getContentDeck(deckId), `${newId} has no topic`).not.toBeNull();
        }
    });
});
