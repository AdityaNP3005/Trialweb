import type {
    Card,
    CardInput,
    DailyStat,
    Deck,
    DeckCounts,
    DeckInput,
    Profile,
    SrsState,
} from "@/types";
import {
    bulkCreateCards as bulkCreateCardsCloud,
    createCard as createCardCloud,
    deleteCard as deleteCardCloud,
    getStudyQueue as getStudyQueueCloud,
    listCards as listCardsCloud,
    setCardSuspended as setCardSuspendedCloud,
    updateCard as updateCardCloud,
} from "@/lib/data/cards";
import {
    createDeck as createDeckCloud,
    deleteDeck as deleteDeckCloud,
    fetchCardTotals,
    fetchDeck,
    fetchDeckCounts,
    fetchGlobalCounts,
    listDecks as listDecksCloud,
} from "@/lib/data/decks";
import { fetchProfile, patchProfile } from "@/lib/data/profile";
import { fetchRecentStats, fetchTodayStat } from "@/lib/data/dailyStats";
import { submitReview as submitReviewCloud } from "@/lib/data/reviews";
import {
    defaultProfileFor,
    type CountSummary,
    type StudyQueue,
    type StudyQueueOptions,
    type StudyStore,
    type SubmitReviewArgs,
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
        return (
            profile ??
            defaultProfileFor({
                displayName: null,
                email: null,
                uiLocale: this.uiLocale,
            })
        );
    }

    async updateProfile(patch: Partial<Omit<Profile, "createdAt">>) {
        await patchProfile(this.uid, patch);
    }

    listDecks(): Promise<Deck[]> {
        return listDecksCloud(this.uid);
    }

    getDeck(deckId: string): Promise<Deck | null> {
        return fetchDeck(this.uid, deckId);
    }

    createDeck(input: DeckInput): Promise<string> {
        return createDeckCloud(this.uid, "de", input);
    }

    deleteDeck(deckId: string): Promise<void> {
        return deleteDeckCloud(this.uid, deckId);
    }

    getDeckCounts(deckId: string): Promise<DeckCounts> {
        return fetchDeckCounts(this.uid, deckId);
    }

    async getGlobalCounts(): Promise<CountSummary> {
        const counts = await fetchGlobalCounts(this.uid);
        return { due: counts.due, newCount: counts.new };
    }

    getCardTotals() {
        return fetchCardTotals(this.uid);
    }

    listCards(deckId: string, max?: number): Promise<Card[]> {
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

    getStudyQueue(options: StudyQueueOptions = {}): Promise<StudyQueue> {
        return getStudyQueueCloud(this.uid, options);
    }

    submitReview(args: SubmitReviewArgs): Promise<SrsState> {
        return submitReviewCloud({ ...args, uid: this.uid });
    }

    getTodayStat(): Promise<DailyStat> {
        return fetchTodayStat(this.uid);
    }

    getRecentStats(days?: number): Promise<DailyStat[]> {
        return fetchRecentStats(this.uid, days);
    }
}
