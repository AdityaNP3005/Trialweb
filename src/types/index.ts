export type CefrLevel = "A1" | "A2" | "B1";

export type WordType =
    | "noun"
    | "verb"
    | "adjective"
    | "adverb"
    | "phrase"
    | "number"
    | "other";

export type Gender = "der" | "die" | "das";

export type CardSource = "seed" | "user" | "ai" | "import";

/**
 * Serialisable snapshot of an FSRS card. `state` is the numeric value of
 * ts-fsrs' `State` enum, kept as a number so it survives Firestore round-trips.
 */
export type SrsState = {
    state: number;
    dueMs: number;
    stability: number;
    difficulty: number;
    elapsedDays: number;
    scheduledDays: number;
    /** Position inside the learning steps (ts-fsrs 5.x). Optional for old docs. */
    learningSteps?: number;
    reps: number;
    lapses: number;
    lastReviewMs: number | null;
};

export type Card = {
    id: string;
    deckId: string;
    courseId: string;
    front: string;
    meaningId: string;
    meaningEn: string;
    gender: Gender | null;
    wordType: WordType;
    plural: string | null;
    ipa: string | null;
    exampleDe: string | null;
    exampleId: string | null;
    exampleEn: string | null;
    tags: string[];
    level: CefrLevel;
    source: CardSource;
    suspended: boolean;
    /** Denormalised for querying: `srs.state === State.New`. */
    isNew: boolean;
    /** Denormalised for querying: mirrors `srs.dueMs`. */
    dueMs: number;
    srs: SrsState;
    createdAt: number;
    updatedAt: number;
};

export type CardInput = Omit<
    Card,
    "id" | "createdAt" | "updatedAt" | "isNew" | "dueMs" | "srs" | "suspended"
> & {
    suspended?: boolean;
};

export type DeckSource = "seed" | "user";

export type Deck = {
    id: string;
    courseId: string;
    name: string;
    description: string;
    level: CefrLevel;
    tags: string[];
    cardCount: number;
    newPerDay: number;
    source: DeckSource;
    isDefault: boolean;
    createdAt: number;
    updatedAt: number;
};

export type DeckInput = {
    name: string;
    description: string;
    level: CefrLevel;
    tags: string[];
    newPerDay: number;
};

export type ReviewRating = 1 | 2 | 3 | 4;
export type StudyMode = "flashcard" | "quiz";

export type ReviewLogEntry = {
    cardId: string;
    deckId: string;
    courseId: string;
    rating: ReviewRating;
    mode: StudyMode;
    correct: boolean;
    durationMs: number;
    reviewMs: number;
    stateBefore: number;
    stateAfter: number;
    dueMs: number;
    stability: number;
    difficulty: number;
    elapsedDays: number;
    scheduledDays: number;
};

export type DailyStat = {
    date: string;
    reviews: number;
    again: number;
    hard: number;
    good: number;
    easy: number;
    newCards: number;
    studyMs: number;
    quizCorrect: number;
    quizTotal: number;
};

export type Profile = {
    displayName: string | null;
    email: string | null;
    uiLocale: "id" | "en";
    activeCourseId: string;
    dailyGoal: number;
    newPerDay: number;
    ttsVoiceURI: string | null;
    ttsRate: number;
    onboardingComplete: boolean;
    createdAt: number;
    updatedAt: number;
};

export type DeckCounts = {
    due: number;
    new: number;
    total: number;
};
