export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const CEFR_LEVELS: readonly CefrLevel[] = [
    "A1",
    "A2",
    "B1",
    "B2",
    "C1",
    "C2",
];

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
    createdAt: number;
    updatedAt: number;
};

export type CardInput = Omit<
    Card,
    "id" | "createdAt" | "updatedAt" | "suspended"
> & {
    suspended?: boolean;
};

export type DeckSource = "content" | "user";

export type Deck = {
    id: string;
    courseId: string;
    name: string;
    description: string;
    level: CefrLevel;
    tags: string[];
    cardCount: number;
    source: DeckSource;
    isDefault: boolean;
    /** Content decks are bundled; user decks live in the account store. */
    readOnly: boolean;
    /** Topic key for bundled decks (e.g. "greetings"). */
    topicKey?: string;
    /** Emoji shown in the topic lists. */
    icon?: string;
    /** Position of the topic inside its band (1-based). */
    topicOrder?: number;
    createdAt: number;
    updatedAt: number;
};

export type DeckInput = {
    name: string;
    description: string;
    level: CefrLevel;
    tags: string[];
};

/** Binary answer for every card in the new study flow. */
export type StudyAction = "repeat" | "next";
export type StudyMode = "flashcard" | "quiz";

/**
 * Per-card state for one account. One document per card that was ever shown,
 * so the collection stays proportional to progress instead of deck size.
 */
export type CardProgress = {
    cardId: string;
    deckId: string;
    courseId: string;
    /** Cycle in which this card was last handled. */
    cycle: number;
    /** `true` when the card was answered with "next" in the current cycle. */
    known: boolean;
    repeatsInCycle: number;
    totalRepeats: number;
    /** How many times the card has ever been marked as known. */
    knownCount: number;
    lastSeenAt: number;
    lastActionAt: number;
};

/**
 * Cursor for one deck: which cards were already introduced in the running
 * cycle, plus cards that still need another pass ("repeat" without "next").
 */
export type DeckCycle = {
    deckId: string;
    cycle: number;
    cursor: number;
    knownInCycle: number;
    pendingCardIds: string[];
    startedAt: number;
    completedAt: number | null;
    lastActivityAt: number;
};

export type LevelSetting = {
    /** How many cards one session takes from this level's deck. */
    sessionSize: number;
    shuffle: boolean;
};

export type BandSettings = Record<CefrLevel, LevelSetting>;

/** Small, non-band-specific preferences for the topic flow. */
export type StudyPrefs = {
    /** Shuffle cards inside a topic instead of frequency order. */
    shuffleCards: boolean;
};

export type DeckProgress = {
    deckId: string;
    level: CefrLevel;
    cycle: number;
    known: number;
    total: number;
    pending: number;
    percent: number;
    lastActivityAt: number | null;
};

export type StudyLogEntry = {
    cardId: string;
    deckId: string;
    courseId: string;
    action: StudyAction;
    mode: StudyMode;
    correct: boolean;
    durationMs: number;
    cycle: number;
    createdAt: number;
};

export type DailyStat = {
    date: string;
    /** Every answered card (repeat + next). */
    reviews: number;
    next: number;
    repeat: number;
    /** Cards that became known during the day. */
    known: number;
    studyMs: number;
    quizCorrect: number;
    quizTotal: number;
    /** Legacy FSRS counters kept so old documents still parse. */
    again?: number;
    hard?: number;
    good?: number;
    easy?: number;
    newCards?: number;
    updatedAt?: number;
};

export type Profile = {
    displayName: string | null;
    email: string | null;
    uiLocale: "id" | "en";
    activeCourseId: string;
    prefs: StudyPrefs;
    ttsVoiceURI: string | null;
    ttsRate: number;
    onboardingComplete: boolean;
    /** Set once the FSRS → cycle migration has run for this account. */
    engineV2?: boolean;
    /** Set once progress has been remapped to topic deck ids. */
    topicsV3?: boolean;
    /** Legacy per-band settings, kept so old documents still load. */
    bands?: BandSettings;
    /** Legacy fields, kept optional so old documents still load. */
    dailyGoal?: number;
    newPerDay?: number;
    createdAt: number;
    updatedAt: number;
};

export type DeckCounts = {
    total: number;
    known: number;
    pending: number;
};
