import type {
    Card,
    CardInput,
    DailyStat,
    Deck,
    DeckInput,
    DeckProgress,
    PlaylistProgress,
    Profile,
    StudyAction,
    StudyMode,
    StudyPrefs,
} from "@/types";
import type { SessionPlan } from "@/lib/study/session";

export type StoreMode = "guest" | "cloud";

export type SubmitActionArgs = {
    card: Card;
    action: StudyAction;
    mode: StudyMode;
    correct: boolean;
    durationMs: number;
    /** Cards introduced by the current session (used to move the cursor). */
    session?: {
        cycle: number;
        introducedCardIds: string[];
        nextCursor: number;
        pendingLeft: string[];
        knownInCycle: number;
    } | null;
    now?: Date;
};

export type CardTotals = { total: number; studied: number };

/**
 * Everything the UI needs, implemented twice:
 * - `guest` : localStorage, no account, works without any Firebase config
 * - `cloud` : Firestore under /users/{uid}
 *
 * Content decks (A1–C2) are bundled with the app; only progress is stored per
 * account, so adding thousands of cards does not multiply Firestore writes.
 */
export interface StudyStore {
    readonly mode: StoreMode;

    getProfile(): Promise<Profile>;
    updateProfile(patch: Partial<Omit<Profile, "createdAt">>): Promise<void>;

    listDecks(): Promise<Deck[]>;
    getDeck(deckId: string): Promise<Deck | null>;
    createDeck(input: DeckInput): Promise<string>;
    deleteDeck(deckId: string): Promise<void>;

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

    getDeckProgress(deckId: string): Promise<DeckProgress>;
    listDeckProgress(): Promise<DeckProgress[]>;
    getCardTotals(courseId?: string): Promise<CardTotals>;

    getSession(deckId: string, sessionSize?: number): Promise<SessionPlan>;
    submitAction(args: SubmitActionArgs): Promise<void>;
    resetDeckCycle(deckId: string): Promise<void>;

    getTodayStat(): Promise<DailyStat>;
    getRecentStats(days?: number): Promise<DailyStat[]>;

    /** Watch progress for one video playlist, or null when never watched. */
    getVideoProgress(playlistId: string): Promise<PlaylistProgress | null>;
    saveVideoProgress(progress: PlaylistProgress): Promise<void>;

    /** Hanzi written to the end in writing practice (per course). */
    getWrittenCharacters(courseId: string): Promise<string[]>;
    markCharacterWritten(courseId: string, char: string): Promise<void>;
}

export const emptyStat = (date: string): DailyStat => ({
    date,
    reviews: 0,
    next: 0,
    repeat: 0,
    known: 0,
    studyMs: 0,
    quizCorrect: 0,
    quizTotal: 0,
    byCourse: {},
});

export const defaultPrefs = (): StudyPrefs => ({ shuffleCards: false });

export const defaultProfileFor = (input: {
    displayName: string | null;
    email: string | null;
    uiLocale: "id" | "en";
}): Profile => ({
    displayName: input.displayName,
    email: input.email,
    uiLocale: input.uiLocale,
    activeCourseId: "de",
    prefs: defaultPrefs(),
    ttsVoiceURI: null,
    ttsVoices: {},
    ttsRate: 1,
    onboardingComplete: true,
    engineV2: true,
    topicsV3: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
});
