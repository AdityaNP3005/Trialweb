import type {
    Card,
    CardInput,
    DailyStat,
    Deck,
    DeckCounts,
    DeckInput,
    Profile,
    ReviewRating,
    SrsState,
    StudyMode,
} from "@/types";

export type StoreMode = "guest" | "cloud";

export type StudyQueueOptions = {
    deckId?: string | null;
    reviewLimit?: number;
    newLimit?: number;
    now?: number;
};

export type StudyQueue = {
    cards: Card[];
    dueCount: number;
    newCount: number;
};

export type SubmitReviewArgs = {
    card: Card;
    rating: ReviewRating;
    mode: StudyMode;
    correct: boolean;
    durationMs: number;
    now?: Date;
};

export type CountSummary = { due: number; newCount: number };

/**
 * Everything the UI needs, implemented twice:
 * - `guest`  : localStorage, no account, works without any Firebase config
 * - `cloud`  : Firestore under /users/{uid}
 */
export interface StudyStore {
    readonly mode: StoreMode;

    getProfile(): Promise<Profile>;
    updateProfile(patch: Partial<Omit<Profile, "createdAt">>): Promise<void>;

    listDecks(): Promise<Deck[]>;
    getDeck(deckId: string): Promise<Deck | null>;
    createDeck(input: DeckInput): Promise<string>;
    deleteDeck(deckId: string): Promise<void>;
    getDeckCounts(deckId: string): Promise<DeckCounts>;

    getGlobalCounts(): Promise<CountSummary>;
    getCardTotals(): Promise<{ total: number; studied: number }>;

    listCards(deckId: string, max?: number): Promise<Card[]>;
    createCard(input: CardInput): Promise<string>;
    updateCard(cardId: string, patch: Partial<CardInput>): Promise<void>;
    deleteCard(card: Pick<Card, "id" | "deckId">): Promise<void>;
    setCardSuspended(cardId: string, suspended: boolean): Promise<void>;
    bulkCreateCards(
        deckId: string,
        inputs: CardInput[],
        onProgress?: (done: number, total: number) => void,
    ): Promise<number>;

    getStudyQueue(options?: StudyQueueOptions): Promise<StudyQueue>;
    submitReview(args: SubmitReviewArgs): Promise<SrsState>;

    getTodayStat(): Promise<DailyStat>;
    getRecentStats(days?: number): Promise<DailyStat[]>;
}

export const defaultProfileFor = (input: {
    displayName: string | null;
    email: string | null;
    uiLocale: "id" | "en";
}): Profile => ({
    displayName: input.displayName,
    email: input.email,
    uiLocale: input.uiLocale,
    activeCourseId: "de",
    dailyGoal: 20,
    newPerDay: 10,
    ttsVoiceURI: null,
    ttsRate: 1,
    onboardingComplete: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
});
