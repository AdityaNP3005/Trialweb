import type {
    BandSettings,
    Card,
    CardInput,
    CefrLevel,
    DailyStat,
    Deck,
    DeckCycle,
    DeckInput,
    DeckProgress,
    Profile,
} from "@/types";
import {
    bulkCreateCards as bulkCreateCardsCloud,
    createCard as createCardCloud,
    deleteCard as deleteCardCloud,
    listCards as listCardsCloud,
    setCardSuspended as setCardSuspendedCloud,
    updateCard as updateCardCloud,
} from "@/lib/data/cards";
import {
    createDeck as createDeckCloud,
    deleteDeck as deleteDeckCloud,
    fetchDeck,
    listDecks as listDecksCloud,
} from "@/lib/data/decks";
import { fetchProfile, patchProfile } from "@/lib/data/profile";
import { fetchRecentStats, fetchTodayStat } from "@/lib/data/dailyStats";
import {
    fetchAllCycles,
    fetchDeckCycle,
    saveDeckCycle,
    submitAction as submitActionCloud,
} from "@/lib/data/progress";
import { getDocs, query, where, writeBatch } from "firebase/firestore";
import { progressColRef } from "@/lib/firebase/paths";
import { getDb } from "@/lib/firebase/client";
import { listContentDecks } from "@/content/courses";
import { getContentDeck, loadContentCards } from "@/lib/content/registry";
import { buildSession, cycleProgress, emptyCycle } from "@/lib/study/session";
import { normalizeBands } from "@/lib/study/progress";
import {
    defaultProfileFor,
    type CardTotals,
    type StudyStore,
    type SubmitActionArgs,
} from "./types";

/** Cloud mode: Firestore under /users/{uid}. Requires a signed-in account. */
export class CloudStore implements StudyStore {
    readonly mode = "cloud" as const;

    constructor(
        private readonly uid: string,
        private readonly uiLocale: "id" | "en",
    ) { }

    async getProfile(): Promise<Profile> {
        const profile = await fetchProfile(this.uid);
        if (!profile) {
            return defaultProfileFor({
                displayName: null,
                email: null,
                uiLocale: this.uiLocale,
            });
        }
        return { ...profile, bands: normalizeBands(profile.bands) };
    }

    async updateProfile(patch: Partial<Omit<Profile, "createdAt">>) {
        await patchProfile(this.uid, patch);
    }

    async updateBandSetting(level: CefrLevel, patch: Partial<BandSettings[CefrLevel]>) {
        const profile = await this.getProfile();
        const bands = normalizeBands({
            ...profile.bands,
            [level]: { ...profile.bands[level], ...patch },
        });
        await patchProfile(this.uid, { bands });
    }

    async listDecks(): Promise<Deck[]> {
        const profile = await this.getProfile();
        const content = listContentDecks(profile.activeCourseId);
        const user = await listDecksCloud(this.uid).catch(() => []);
        return [...content, ...user];
    }

    async getDeck(deckId: string): Promise<Deck | null> {
        const bundled = getContentDeck(deckId);
        if (bundled) {
            return (
                listContentDecks(bundled.courseId).find((deck) => deck.id === deckId) ?? null
            );
        }
        return fetchDeck(this.uid, deckId);
    }

    createDeck(input: DeckInput): Promise<string> {
        return createDeckCloud(this.uid, "de", input);
    }

    deleteDeck(deckId: string): Promise<void> {
        return deleteDeckCloud(this.uid, deckId);
    }

    async listCards(deckId: string, max = 5000): Promise<Card[]> {
        if (getContentDeck(deckId)) {
            const cards = await loadContentCards(deckId);
            return cards.slice(0, max);
        }
        return listCardsCloud(this.uid, deckId, max);
    }

    createCard(input: CardInput): Promise<string> {
        return createCardCloud(this.uid, input);
    }

    updateCard(cardId: string, patch: Partial<CardInput>): Promise<void> {
        return updateCardCloud(this.uid, cardId, patch);
    }

    deleteCard(card: Pick<Card, "id" | "deckId">): Promise<void> {
        return deleteCardCloud(this.uid, card);
    }

    setCardSuspended(cardId: string, suspended: boolean): Promise<void> {
        return setCardSuspendedCloud(this.uid, cardId, suspended);
    }

    bulkCreateCards(
        deckId: string,
        inputs: CardInput[],
        onProgress?: (done: number, total: number) => void,
    ): Promise<number> {
        return bulkCreateCardsCloud(this.uid, deckId, inputs, onProgress);
    }

    async getDeckProgress(deckId: string): Promise<DeckProgress> {
        const deck = await this.getDeck(deckId);
        const cycle = await fetchDeckCycle(this.uid, deckId).catch(() => null);
        const stats = cycleProgress(cycle, deck?.cardCount ?? 0);
        return { deckId, level: deck?.level ?? "A1", ...stats };
    }

    async listDeckProgress(): Promise<DeckProgress[]> {
        const [decks, cycles] = await Promise.all([
            this.listDecks(),
            fetchAllCycles(this.uid).catch(() => [] as DeckCycle[]),
        ]);
        const byDeck = new Map(cycles.map((cycle) => [cycle.deckId, cycle]));
        return decks.map((deck) => {
            const stats = cycleProgress(byDeck.get(deck.id) ?? null, deck.cardCount);
            return { deckId: deck.id, level: deck.level, ...stats };
        });
    }

    async getCardTotals(): Promise<CardTotals> {
        const [decks, cycles] = await Promise.all([
            this.listDecks(),
            fetchAllCycles(this.uid).catch(() => [] as DeckCycle[]),
        ]);
        const total = decks.reduce((sum, deck) => sum + deck.cardCount, 0);
        const studied = cycles.reduce((sum, cycle) => sum + (cycle.knownInCycle ?? 0), 0);
        return { total, studied: Math.min(total, studied) };
    }

    async getSession(deckId: string, sessionSize?: number) {
        const [deck, profile, stored] = await Promise.all([
            this.getDeck(deckId),
            this.getProfile(),
            fetchDeckCycle(this.uid, deckId).catch(() => null),
        ]);
        if (!deck) throw new Error("Deck not found");

        const cards = await this.listCards(deckId, 20000);
        const size = sessionSize ?? profile.bands[deck.level]?.sessionSize ?? 20;
        const now = Date.now();

        const plan = buildSession({
            deckId,
            cards,
            cycle: stored ?? emptyCycle(deckId, now),
            sessionSize: size,
            shuffle: profile.bands[deck.level]?.shuffle ?? false,
        });

        await saveDeckCycle(this.uid, {
            deckId,
            cycle: plan.cycle,
            cursor: plan.nextCursor,
            knownInCycle: plan.cycleReset ? 0 : plan.knownInCycle,
            pendingCardIds: plan.pendingLeft,
            startedAt: plan.cycleReset ? now : (stored?.startedAt ?? now),
            completedAt: null,
            lastActivityAt: now,
        });

        return plan;
    }

    submitAction(args: SubmitActionArgs): Promise<void> {
        return submitActionCloud({
            uid: this.uid,
            card: args.card,
            action: args.action,
            mode: args.mode,
            correct: args.correct,
            durationMs: args.durationMs,
            cycle: args.session?.cycle,
            now: args.now,
        });
    }

    async resetDeckCycle(deckId: string): Promise<void> {
        const now = Date.now();
        const deck = await this.getDeck(deckId);
        await saveDeckCycle(this.uid, {
            ...emptyCycle(deckId, now),
            deckId,
        });

        if (!deck) return;

        const snapshot = await getDocs(
            query(progressColRef(this.uid), where("deckId", "==", deckId)),
        );
        for (let index = 0; index < snapshot.docs.length; index += 400) {
            const batch = writeBatch(getDb());
            for (const entry of snapshot.docs.slice(index, index + 400)) {
                batch.delete(entry.ref);
            }
            await batch.commit();
        }
    }

    getTodayStat(): Promise<DailyStat> {
        return fetchTodayStat(this.uid);
    }

    getRecentStats(days?: number): Promise<DailyStat[]> {
        return fetchRecentStats(this.uid, days);
    }
}
