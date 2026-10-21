import { describe, expect, it } from "vitest";
import assignments from "../../scripts/content/de-topic-assignments.json";
import catalog from "../../scripts/content/de-topic-catalog.json";
import previousLayout from "@/content/topic-map-v6.json";
import manifest from "@/content/manifest.json";
import { germanHeadword } from "@/lib/content/german";
import { localizedUnitName } from "@/lib/content/labels";
import { loadReviewedGermanCards } from "@/lib/content/review-progress";
import { previousTopicCards, reclassifyTopicProgress } from "@/lib/content/topic-progress";
import { buildSession, emptyCycle } from "@/lib/study/session";
import type { Card, CardProgress, DeckCycle } from "@/types";

const first = "de-a1-old-a";
const second = "de-a1-old-b";
const destination = "de-a1-new";
const id = (deck: string, suffix: number) => `${deck}-${String(suffix).padStart(4, "0")}`;
const smallLayout = { [first]: [1, 3, 4], [second]: [1, 2] };
const card = (cardId: string, deckId = destination) => ({ id: cardId, deckId, suspended: false }) as Card;
const history = (cardId: string, known: boolean, knownCount = Number(known)): CardProgress => ({
    cardId, deckId: cardId.replace(/-\d{4}$/, ""), courseId: "de", cycle: 4,
    known, knownCount, repeatsInCycle: 0, totalRepeats: 7,
    lastSeenAt: 100, lastActionAt: 100,
});

function cycle(deckId: string, cursor: number): DeckCycle {
    return { ...emptyCycle(deckId, 1), cycle: 4, cursor, knownInCycle: 1 };
}

describe("semantic German topic inventory", () => {
    it("accounts for every v5 card exactly once and follows its reviewed category", async () => {
        const cards = await loadReviewedGermanCards();
        const oldIds = [...previousTopicCards(previousLayout.fromDecks).values()].flat();
        expect(cards).toHaveLength(9483);
        expect(new Set(cards.map((entry) => entry.id))).toEqual(new Set(oldIds));
        expect(Object.keys(assignments)).toHaveLength(cards.length);
        for (const entry of cards) {
            const expected = assignments[germanHeadword(entry.front) as keyof typeof assignments];
            expect(entry.tags).toEqual([expected]);
            expect(entry.deckId).toMatch(new RegExp(`^de-${entry.level.toLowerCase()}-${expected}(?:-\\d+)?$`));
        }
        for (const level of manifest.levels) {
            for (const topic of level.topics) {
                expect(topic.cardCount).toBeGreaterThan(0);
                expect(topic.cardCount).toBeLessThanOrEqual(80);
                expect(cards.filter((entry) => entry.deckId === topic.id)).toHaveLength(topic.cardCount);
                expect(topic.key).not.toMatch(/^general(?:-|$)/);
            }
        }
    });

    it("places previously misleading words by meaning, including compound false matches", async () => {
        const cards = await loadReviewedGermanCards();
        const expectations: Record<string, string> = {
            "Waschbär": "nature-animals", "Stachelschwein": "nature-animals",
            "Sparschwein": "work-economy", "Psychose": "health-psychology",
            "Komitee": "society-politics", "Krankenschwester": "health-psychology",
            "Zahnfleisch": "body-health", "Wettervorhersage": "environment-nature",
            "Bestechungsgeld": "law-crime", "Plattenspieler": "media-tech",
            "Hashtag": "media-tech", "Pentagramm": "religion-mythology",
            "Schneesturm": "environment-nature", "Margarine": "food-drink",
            "Galaxie": "education-science", "Schlüsselwort": "language-communication",
        };
        for (const [front, topic] of Object.entries(expectations)) {
            expect(cards.find((entry) => entry.front === front)?.tags, front).toEqual([topic]);
        }
    });

    it("localizes every category and split title", () => {
        for (const { title } of Object.values(catalog.topics)) {
            expect(localizedUnitName(title, "en")).not.toBe(title);
            expect(localizedUnitName(title, "id")).toBe(title);
            expect(localizedUnitName(`${title} (1/2)`, "en")).toBe(`${localizedUnitName(title, "en")} (1/2)`);
        }
    });
});

describe("semantic-topic progress migration", () => {
    it("preserves stable histories and queues unseen gaps before the new cursor", () => {
        const cards = [card(id(first, 1)), card(id(second, 1)), card(id(first, 3)), card(id(second, 2))];
        const progress = [history(id(first, 1), true), history(id(first, 3), false)];
        const result = reclassifyTopicProgress(progress, [cycle(first, 2)], cards, smallLayout, 200);
        expect(result.progress[0]).toMatchObject({ cardId: id(first, 1), deckId: destination, known: true,
            knownCount: 1, totalRepeats: 7 });
        const next = result.cycles.find((entry) => entry.deckId === destination)!;
        expect(next).toMatchObject({ cursor: 3, knownInCycle: 1, cycle: 1,
            pendingCardIds: [id(second, 1), id(first, 3)], topicsV6: true });
        const plan = buildSession({ deckId: destination, cards, cycle: next, sessionSize: 80 });
        expect(plan.cards.map((entry) => entry.id)).toEqual([id(second, 1), id(first, 3), id(second, 2)]);
        expect(result.retiredDeckIds).toEqual([first]);
    });

    it("keeps a genuinely unchanged topic cycle, and custom/Mandarin data intact", () => {
        const old = { ...cycle(first, 2), pendingCardIds: [id(first, 3)] };
        const custom = { ...history("custom-card", true), deckId: "custom" };
        const zh = cycle("zh-book1-l01", 13);
        const result = reclassifyTopicProgress([history(id(first, 1), true), custom], [old, zh],
            [card(id(first, 1), first), card(id(first, 3), first), card(id(first, 4), first)], smallLayout, 200);
        expect(result.cycles.find((entry) => entry.deckId === first)).toEqual({ ...old, topicsV6: true, previousTopicCursor: 2 });
        expect(result.cycles.find((entry) => entry.deckId === zh.deckId)).toEqual(zh);
        expect(result.progress.find((entry) => entry.cardId === custom.cardId)).toEqual(custom);
    });

    it("preserves completed knowledge when every card in the new topic has been learned", () => {
        const cards = [card(id(first, 1)), card(id(second, 1))];
        const result = reclassifyTopicProgress(cards.map((entry) => history(entry.id, true, 3)),
            [cycle(first, 1), cycle(second, 1)], cards, smallLayout, 200);
        expect(result.cycles[0]).toMatchObject({ cycle: 2, knownInCycle: 2, cursor: 2, pendingCardIds: [] });
        expect(result.progress.every((entry) => entry.knownCount === 3 && entry.known)).toBe(true);
    });

    it("can retry after an atomic deck batch without reinterpreting its new cursor as an old cursor", () => {
        const moved = "de-a1-other";
        const cards = [card(id(first, 3), first), card(id(second, 1), first), card(id(first, 1), moved)];
        const original = [history(id(first, 3), true), history(id(first, 1), false)];
        const oldCycles = [cycle(first, 2), cycle(second, 0)];
        const complete = reclassifyTopicProgress(original, oldCycles, cards, smallLayout, 200);
        const committedCycle = complete.cycles.find((entry) => entry.deckId === first)!;
        const partialProgress = original.map((entry) => complete.progress.find(
            (updated) => updated.cardId === entry.cardId && updated.deckId === first,
        ) ?? entry);
        const retry = reclassifyTopicProgress(partialProgress,
            [committedCycle, oldCycles[1]], cards, smallLayout, 200);
        expect(retry.progress).toEqual(complete.progress);
        expect(retry.cycles.filter((entry) => entry.topicsV6)).toEqual(complete.cycles.filter((entry) => entry.topicsV6));
        const again = reclassifyTopicProgress(complete.progress, complete.cycles, cards, smallLayout, 200);
        expect(again.progress).toEqual(complete.progress);
        expect(again.cycles).toEqual(complete.cycles);
    });
});
