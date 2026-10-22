import { afterEach, describe, expect, it, vi } from "vitest";
import aliases from "@/content/de/review-aliases.json";
import { germanHeadword } from "@/lib/content/german";
import { loadReviewedGermanCards, consolidateReviewedProgress } from "@/lib/content/review-progress";
import { emptyCycle } from "@/lib/study/session";
import type { CardProgress } from "@/types";
import { GuestStore, GUEST_STORAGE_KEY } from "@/lib/store/local-store";
import { defaultProfileFor } from "@/lib/store/types";

afterEach(() => vi.unstubAllGlobals());

const deckId = "de-a1-greetings";
const card = (position: number) => ({ id: `${deckId}-${String(position).padStart(4, "0")}`, deckId });
function progress(position: number, known = false): CardProgress {
    return {
        cardId: card(position).id, deckId, courseId: "de", cycle: 3, known,
        repeatsInCycle: 0, totalRepeats: position, knownCount: position,
        lastSeenAt: position, lastActionAt: position,
    };
}

describe("reviewed German vocabulary", () => {
    it("normalizes case, articles, Unicode, punctuation and spelling variants", () => {
        expect(germanHeadword("  DER   Morgen! ")).toBe("morgen");
        expect(germanHeadword("Tschüs")).toBe(germanHeadword("Tschüss"));
        expect(germanHeadword("Geographie")).toBe(germanHeadword("Geografie"));
        expect(germanHeadword("scho\u0308n")).toBe(germanHeadword("schön"));
        expect(germanHeadword("schon")).not.toBe(germanHeadword("schön"));
    });

    it("loads every headword exactly once across A1–C2 and resolves all aliases", async () => {
        const cards = await loadReviewedGermanCards();
        const ids = new Set(cards.map((entry) => entry.id));
        const words = new Set(cards.map((entry) => germanHeadword(entry.front)));
        expect(cards).toHaveLength(9483);
        expect(ids.size).toBe(cards.length);
        expect(words.size).toBe(cards.length);
        for (const [removed, target] of Object.entries(aliases)) {
            expect(ids.has(removed), removed).toBe(false);
            expect(ids.has(target), target).toBe(true);
        }
        const hallo = cards.find((entry) => entry.front === "Hallo")!;
        expect(hallo.id).toBe("de-a1-greetings-0001");
        expect(cards.filter((entry) => !entry.readingId)).toEqual([]);
        expect(hallo.readingId).toBe("ha-lo");
        expect(cards.find((entry) => entry.front === "Entschuldigung")?.readingId).toBe("ent-syul-di-gung");
        expect(cards.find((entry) => entry.front === "Tschüss")?.readingId).toBe("cis");
        expect(hallo.meaningId).not.toContain("saluir");
        const morgen = cards.find((entry) => entry.front === "morgen")!;
        expect(morgen.meaningId).toContain("besok");
        expect(morgen.meaningId).toContain("pagi");
        expect(cards.find((entry) => entry.front === "Richter")?.meaningId).toBe("hakim");
        expect(cards.find((entry) => entry.front === "Ruf")?.meaningId).toContain("panggilan");
        // Retained cards after a removed entry must not inherit its progress id.
        expect(cards.find((entry) => entry.id === "de-a1-greetings-0018")?.front).toBe("wie");
    });
});

describe("German vocabulary progress consolidation", () => {
    const oldCycle = { ...emptyCycle(deckId, 1), cycle: 3, cursor: 3,
        knownInCycle: 2, pendingCardIds: [card(2).id] };
    const reviewAliases = { [card(2).id]: card(1).id };
    const cards = [card(1), card(3), card(4)];

    it("keeps survivor history and corrects cursors without assigning history to another word", () => {
        const result = consolidateReviewedProgress(
            [progress(1, true), progress(2), progress(3, true)],
            [oldCycle], cards, reviewAliases,
        );
        expect(result.progress.map((entry) => entry.cardId)).toEqual([card(1).id, card(3).id]);
        expect(result.progress[0]).toMatchObject({ known: true, knownCount: 2, totalRepeats: 2 });
        expect(result.cycles[0]).toMatchObject({ cycle: 3, cursor: 2, knownInCycle: 2,
            pendingCardIds: [card(1).id], vocabV5: true });
        expect(consolidateReviewedProgress(result.progress, result.cycles, cards, reviewAliases)).toEqual(result);
    });

    it("moves history across topics, requeues the combined meaning and leaves other courses alone", () => {
        const other = { id: "de-a2-general-0009", deckId: "de-a2-general" };
        const custom = { ...progress(4), cardId: "custom-card", deckId: "custom" };
        const zhCycle = { ...emptyCycle("zh-book1-l01", 1), cursor: 12 };
        const result = consolidateReviewedProgress(
            [{ ...progress(2, true), cardId: other.id, deckId: other.deckId }, custom],
            [oldCycle, zhCycle], cards, { [other.id]: card(1).id },
        );
        expect(result.progress[0]).toMatchObject({ cardId: card(1).id, deckId, cycle: 3, known: false });
        expect(result.progress[1]).toEqual(custom);
        expect(result.cycles.find((entry) => entry.deckId === deckId)?.pendingCardIds).toEqual([card(1).id]);
        expect(result.cycles.find((entry) => entry.deckId === zhCycle.deckId)).toEqual(zhCycle);
        expect(consolidateReviewedProgress(result.progress, result.cycles, cards, reviewAliases)).toEqual(result);
    });

    it("requeues an unknown survivor after a partially completed cloud migration", () => {
        const result = consolidateReviewedProgress([progress(1)], [oldCycle], cards, reviewAliases);
        expect(result.cycles[0].pendingCardIds).toContain(card(1).id);
    });

    it("upgrades a real version-4 guest snapshot once, preserving custom and Mandarin cycles", async () => {
        const cards = await loadReviewedGermanCards();
        const [removed, target] = Object.entries(aliases).find(([, id]) => id === `${deckId}-0001`)!;
        const zh = emptyCycle("zh-book1-l01", 1);
        const custom = { ...progress(4), cardId: "my-card", deckId: "my-deck" };
        const data = new Map<string, string>([[GUEST_STORAGE_KEY, JSON.stringify({
            version: 2, contentVersion: 4,
            profile: defaultProfileFor({ displayName: null, email: null, uiLocale: "id" }),
            decks: [], cards: [], progress: {
                [removed]: { ...progress(2), cardId: removed }, [custom.cardId]: custom,
            }, cycles: { [deckId]: { ...oldCycle, cursor: 35 }, [zh.deckId]: zh },
        })]]);
        vi.stubGlobal("window", { localStorage: {
            getItem: (key: string) => data.get(key) ?? null,
            setItem: (key: string, value: string) => data.set(key, value),
        } });
        await new GuestStore("id").getProfile();
        const saved = JSON.parse(data.get(GUEST_STORAGE_KEY)!);
        expect(saved.contentVersion).toBe(6);
        expect(saved.progress[removed]).toBeUndefined();
        expect(saved.progress[target].cardId).toBe(target);
        expect(saved.progress[custom.cardId]).toEqual(custom);
        expect(saved.cycles[zh.deckId]).toEqual(zh);
        const destination = cards.find((entry) => entry.id === target)!;
        expect(saved.progress[target].deckId).toBe(destination.deckId);
        expect(saved.cycles[destination.deckId].topicsV6).toBe(true);
        expect(saved.cycles[destination.deckId].pendingCardIds).toContain(target);
        await new GuestStore("id").getProfile();
        expect(JSON.parse(data.get(GUEST_STORAGE_KEY)!)).toEqual(saved);
    });
});
