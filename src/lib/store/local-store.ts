import type {
    Card,
    CardInput,
    DailyStat,
    Deck,
    DeckCounts,
    DeckInput,
    Profile,
    ReviewLogEntry,
    SrsState,
} from "@/types";
import { newSrsState, scheduleReview } from "@/lib/srs/fsrs";
import { cardInputSchema, deckInputSchema } from "@/lib/validation/schemas";
import { dateKey } from "@/lib/utils/date";
import { loadSeed } from "@/lib/data/seedLoader";
import {
    defaultProfileFor,
    type CountSummary,
    type StudyQueue,
    type StudyQueueOptions,
    type StudyStore,
    type SubmitReviewArgs,
} from "./types";

export const GUEST_STORAGE_KEY = "goabroad.guest.v1";
export const SEED_DECK_ID = "de-a1-core-seed";
const MAX_REVIEWS = 5000;

export type GuestDb = {
    version: 1;
    profile: Profile;
    decks: Deck[];
    cards: Card[];
    reviews: ReviewLogEntry[];
    dailyStats: Record<string, DailyStat>;
};

const emptyStat = (date: string): DailyStat => ({
    date,
    reviews: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    newCards: 0,
    studyMs: 0,
    quizCorrect: 0,
    quizTotal: 0,
});

function readRaw(): GuestDb | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as GuestDb;
        if (parsed?.version !== 1 || !Array.isArray(parsed.cards)) return null;
        return parsed;
    } catch {
        return null;
    }
}

/** Used by the sign-in migration. */
export function readGuestSnapshot(): GuestDb | null {
    return readRaw();
}

export function clearGuestSnapshot() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
}

function uid(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Guest mode: everything (deck, progress, stats) lives in localStorage. */
export class GuestStore implements StudyStore {
    readonly mode = "guest" as const;
    private db: GuestDb | null = null;

    constructor(private readonly uiLocale: "id" | "en") { }

    private async ensure(): Promise<GuestDb> {
        if (this.db) return this.db;

        const existing = readRaw();
        if (existing) {
            this.db = existing;
            return existing;
        }

        this.db = await buildEmptyDb(this.uiLocale);
        this.persist();
        return this.db;
    }

    private persist() {
        if (typeof window === "undefined" || !this.db) return;
        try {
            this.db.reviews = this.db.reviews.slice(-MAX_REVIEWS);
            window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(this.db));
        } catch {
            // Quota exceeded: keep working in memory.
        }
    }

    async getProfile(): Promise<Profile> {
        return (await this.ensure()).profile;
    }

    async updateProfile(patch: Partial<Omit<Profile, "createdAt">>) {
        const db = await this.ensure();
        db.profile = { ...db.profile, ...patch, updatedAt: Date.now() };
        this.persist();
    }

    async listDecks(): Promise<Deck[]> {
        const db = await this.ensure();
        return [...db.decks].sort((a, b) => a.createdAt - b.createdAt);
    }

    async getDeck(deckId: string): Promise<Deck | null> {
        const db = await this.ensure();
        return db.decks.find((deck) => deck.id === deckId) ?? null;
    }

    async createDeck(raw: DeckInput): Promise<string> {
        const db = await this.ensure();
        const input = deckInputSchema.parse(raw);
        const now = Date.now();
        const deck: Deck = {
            id: uid(),
            courseId: db.profile.activeCourseId,
            name: input.name,
            description: input.description,
            level: input.level,
            tags: input.tags,
            cardCount: 0,
            newPerDay: input.newPerDay,
            source: "user",
            isDefault: false,
            createdAt: now,
            updatedAt: now,
        };
        db.decks.push(deck);
        this.persist();
        return deck.id;
    }

    async deleteDeck(deckId: string) {
        const db = await this.ensure();
        db.decks = db.decks.filter((deck) => deck.id !== deckId);
        db.cards = db.cards.filter((card) => card.deckId !== deckId);
        this.persist();
    }

    async getDeckCounts(deckId: string): Promise<DeckCounts> {
        const db = await this.ensure();
        const now = Date.now();
        const cards = db.cards.filter((card) => card.deckId === deckId);
        return {
            total: cards.length,
            due: cards.filter((card) => !card.isNew && card.dueMs <= now).length,
            new: cards.filter((card) => card.isNew).length,
        };
    }

    async getGlobalCounts(): Promise<CountSummary> {
        const db = await this.ensure();
        const now = Date.now();
        return {
            due: db.cards.filter((card) => !card.isNew && card.dueMs <= now).length,
            newCount: db.cards.filter((card) => card.isNew).length,
        };
    }

    async getCardTotals() {
        const db = await this.ensure();
        return {
            total: db.cards.length,
            studied: db.cards.filter((card) => !card.isNew).length,
        };
    }

    async listCards(deckId: string, max = 500): Promise<Card[]> {
        const db = await this.ensure();
        return db.cards
            .filter((card) => card.deckId === deckId)
            .sort((a, b) => a.createdAt - b.createdAt)
            .slice(0, max);
    }

    async createCard(input: CardInput): Promise<string> {
        const db = await this.ensure();
        const parsed = cardInputSchema.parse(input);
        const now = Date.now();
        const srs = newSrsState(now);
        const card: Card = {
            ...parsed,
            id: uid(),
            suspended: parsed.suspended ?? false,
            isNew: true,
            dueMs: srs.dueMs,
            srs,
            createdAt: now,
            updatedAt: now,
        };
        db.cards.push(card);
        bumpDeck(db, card.deckId, 1);
        this.persist();
        return card.id;
    }

    async updateCard(cardId: string, patch: Partial<CardInput>) {
        const db = await this.ensure();
        const parsed = cardInputSchema.partial().parse(patch);
        const index = db.cards.findIndex((card) => card.id === cardId);
        if (index === -1) return;
        db.cards[index] = { ...db.cards[index], ...parsed, updatedAt: Date.now() };
        this.persist();
    }

    async deleteCard(card: Pick<Card, "id" | "deckId">) {
        const db = await this.ensure();
        db.cards = db.cards.filter((entry) => entry.id !== card.id);
        bumpDeck(db, card.deckId, -1);
        this.persist();
    }

    async setCardSuspended(cardId: string, suspended: boolean) {
        const db = await this.ensure();
        const index = db.cards.findIndex((card) => card.id === cardId);
        if (index === -1) return;
        db.cards[index] = { ...db.cards[index], suspended, updatedAt: Date.now() };
        this.persist();
    }

    async bulkCreateCards(
        deckId: string,
        inputs: CardInput[],
        onProgress?: (done: number, total: number) => void,
    ): Promise<number> {
        const db = await this.ensure();
        const now = Date.now();

        for (const input of inputs) {
            const parsed = cardInputSchema.parse({ ...input, deckId });
            const srs = newSrsState(now);
            db.cards.push({
                ...parsed,
                id: uid(),
                suspended: parsed.suspended ?? false,
                isNew: true,
                dueMs: srs.dueMs,
                srs,
                createdAt: now,
                updatedAt: now,
            });
        }

        bumpDeck(db, deckId, inputs.length);
        this.persist();
        onProgress?.(inputs.length, inputs.length);
        return inputs.length;
    }

    async getStudyQueue(options: StudyQueueOptions = {}): Promise<StudyQueue> {
        const db = await this.ensure();
        const now = options.now ?? Date.now();
        const reviewLimit = options.reviewLimit ?? 100;
        const newLimit = options.newLimit ?? 10;

        const pool = db.cards.filter(
            (card) =>
                !card.suspended &&
                (options.deckId ? card.deckId === options.deckId : true),
        );

        const reviews = pool
            .filter((card) => !card.isNew && card.dueMs <= now)
            .sort((a, b) => a.dueMs - b.dueMs)
            .slice(0, reviewLimit);

        const fresh = pool
            .filter((card) => card.isNew)
            .sort((a, b) => a.createdAt - b.createdAt)
            .slice(0, newLimit);

        return {
            cards: [...reviews, ...fresh],
            dueCount: reviews.length,
            newCount: fresh.length,
        };
    }

    async submitReview({
        card,
        rating,
        mode,
        correct,
        durationMs,
        now = new Date(),
    }: SubmitReviewArgs): Promise<SrsState> {
        const db = await this.ensure();
        const reviewedAt = now.getTime();
        const { srs, log } = scheduleReview(card.srs, rating, now);

        const index = db.cards.findIndex((entry) => entry.id === card.id);
        if (index !== -1) {
            db.cards[index] = {
                ...db.cards[index],
                srs,
                dueMs: srs.dueMs,
                isNew: false,
                updatedAt: reviewedAt,
            };
        }

        db.reviews.push({
            cardId: card.id,
            deckId: card.deckId,
            courseId: card.courseId,
            rating,
            mode,
            correct,
            durationMs,
            reviewMs: log.reviewMs,
            stateBefore: log.stateBefore,
            stateAfter: log.stateAfter,
            dueMs: log.dueMs,
            stability: log.stability,
            difficulty: log.difficulty,
            elapsedDays: log.elapsedDays,
            scheduledDays: log.scheduledDays,
        });

        const key = dateKey(now);
        const stat = db.dailyStats[key] ?? emptyStat(key);
        const ratingField = (["again", "hard", "good", "easy"] as const)[rating - 1];

        db.dailyStats[key] = {
            ...stat,
            reviews: stat.reviews + 1,
            [ratingField]: stat[ratingField] + 1,
            newCards: stat.newCards + (card.isNew ? 1 : 0),
            studyMs: stat.studyMs + Math.max(0, Math.round(durationMs)),
            quizCorrect: stat.quizCorrect + (mode === "quiz" && correct ? 1 : 0),
            quizTotal: stat.quizTotal + (mode === "quiz" ? 1 : 0),
        };

        this.persist();
        return srs;
    }

    async getTodayStat(): Promise<DailyStat> {
        const db = await this.ensure();
        const key = dateKey();
        return db.dailyStats[key] ?? emptyStat(key);
    }

    async getRecentStats(days = 90): Promise<DailyStat[]> {
        const db = await this.ensure();
        return Object.keys(db.dailyStats)
            .sort()
            .slice(-days)
            .map((key) => db.dailyStats[key] ?? emptyStat(key));
    }
}

function bumpDeck(db: GuestDb, deckId: string, delta: number) {
    const index = db.decks.findIndex((deck) => deck.id === deckId);
    if (index === -1) return;
    db.decks[index] = {
        ...db.decks[index],
        cardCount: Math.max(0, db.decks[index].cardCount + delta),
        updatedAt: Date.now(),
    };
}

async function buildEmptyDb(uiLocale: "id" | "en"): Promise<GuestDb> {
    const seed = await loadSeed();
    const now = Date.now();
    const srs = newSrsState(now);

    const cards: Card[] = seed.cards.map((card, index) => ({
        id: `seed-${seed.courseId}-${String(index + 1).padStart(4, "0")}`,
        deckId: SEED_DECK_ID,
        courseId: seed.courseId,
        front: card.front,
        meaningId: card.meaningId,
        meaningEn: card.meaningEn,
        gender: card.gender ?? null,
        wordType: card.wordType ?? "other",
        plural: card.plural ?? null,
        ipa: card.ipa ?? null,
        exampleDe: card.exampleDe ?? null,
        exampleId: card.exampleId ?? null,
        exampleEn: card.exampleEn ?? null,
        tags: card.tags ?? [],
        level: card.level ?? "A1",
        source: "seed",
        suspended: false,
        isNew: true,
        dueMs: srs.dueMs,
        srs: { ...srs },
        createdAt: now,
        updatedAt: now,
    }));

    return {
        version: 1,
        profile: defaultProfileFor({
            displayName: null,
            email: null,
            uiLocale,
        }),
        decks: [
            {
                id: SEED_DECK_ID,
                courseId: seed.courseId,
                name: seed.deck.name,
                description: seed.deck.description,
                level: seed.deck.level,
                tags: seed.deck.tags,
                cardCount: cards.length,
                newPerDay: 10,
                source: "seed",
                isDefault: true,
                createdAt: now,
                updatedAt: now,
            },
        ],
        cards,
        reviews: [],
        dailyStats: {},
    };
}
