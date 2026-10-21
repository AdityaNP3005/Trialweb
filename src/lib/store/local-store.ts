import type {
    Card,
    CardInput,
    CardProgress,
    DailyStat,
    Deck,
    DeckCycle,
    DeckInput,
    DeckProgress,
    Profile,
    StudyLogEntry,
} from "@/types";
import { cardInputSchema, deckInputSchema } from "@/lib/validation/schemas";
import { dateKey } from "@/lib/utils/date";
import { listContentDecks } from "@/content/courses";
import { getContentDeck, loadContentCards } from "@/lib/content/registry";
import { buildSession, cycleProgress, emptyCycle } from "@/lib/study/session";
import { normalizeBands, progressPercent } from "@/lib/study/progress";
import {
    defaultProfileFor,
    emptyStat,
    type CardTotals,
    type StudyStore,
    type SubmitActionArgs,
} from "./types";

export const GUEST_STORAGE_KEY = "goabroad.guest.v2";
export const LEGACY_GUEST_STORAGE_KEY = "goabroad.guest.v1";
const MAX_LOGS = 5000;
const MAX_PENDING = 200;

export const LEGACY_SEED_DECK_ID = "de-a1-core-seed";
export const SEED_DECK_ID = "de-a1-core";

export type GuestDb = {
    version: 2;
    /** 3 = progress keys use topic deck ids. */
    contentVersion?: number;
    profile: Profile;
    decks: Deck[];
    cards: Card[];
    progress: Record<string, CardProgress>;
    cycles: Record<string, DeckCycle>;
    logs: StudyLogEntry[];
    dailyStats: Record<string, DailyStat>;
};

function readRaw(): GuestDb | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as GuestDb;
        if (parsed?.version !== 2 || !Array.isArray(parsed.cards)) return null;
        parsed.profile = { ...parsed.profile, bands: normalizeBands(parsed.profile.bands) };
        parsed.progress ??= {};
        parsed.cycles ??= {};
        parsed.logs ??= [];
        parsed.dailyStats ??= {};
        return parsed;
    } catch {
        return null;
    }
}

/** Used by the cloud migration. */
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

function emptyProgress(card: Pick<Card, "id" | "deckId" | "courseId">, cycle: number): CardProgress {
    const now = Date.now();
    return {
        cardId: card.id,
        deckId: card.deckId,
        courseId: card.courseId,
        cycle,
        known: false,
        repeatsInCycle: 0,
        totalRepeats: 0,
        knownCount: 0,
        lastSeenAt: now,
        lastActionAt: now,
    };
}

/** Guest mode: deck content, progress and stats live in localStorage. */
export class GuestStore implements StudyStore {
    readonly mode = "guest" as const;
    private db: GuestDb | null = null;

    constructor(private readonly uiLocale: "id" | "en") { }

    private async ensure(): Promise<GuestDb> {
        if (this.db) return this.db;

        const existing = readRaw() ?? migrateLegacyGuest();
        if (existing) {
            this.db = existing;
        } else {
            this.db = {
                version: 2,
                contentVersion: 4,
                profile: defaultProfileFor({
                    displayName: null,
                    email: null,
                    uiLocale: this.uiLocale,
                }),
                decks: [],
                cards: [],
                progress: {},
                cycles: {},
                logs: [],
                dailyStats: {},
            };
        }

        if (this.db.contentVersion !== 4) {
            await remapTopics(this.db);
        }
        this.persist();
        return this.db;
    }

    private persist() {
        if (typeof window === "undefined" || !this.db) return;
        try {
            this.db.logs = this.db.logs.slice(-MAX_LOGS);
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
        db.profile = {
            ...db.profile,
            ...patch,
            prefs: patch.prefs ?? db.profile.prefs,
            updatedAt: Date.now(),
        };
        this.persist();
    }

    async listDecks(): Promise<Deck[]> {
        const db = await this.ensure();
        const content = listContentDecks(db.profile.activeCourseId);
        const user = [...db.decks].sort((a, b) => a.createdAt - b.createdAt);
        return [...content, ...user];
    }

    async getDeck(deckId: string): Promise<Deck | null> {
        const content = getContentDeck(deckId);
        if (content) {
            return (
                listContentDecks(content.courseId).find((deck) => deck.id === deckId) ?? null
            );
        }
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
            source: "user",
            isDefault: false,
            readOnly: false,
            createdAt: now,
            updatedAt: now,
        };
        db.decks.push(deck);
        this.persist();
        return deck.id;
    }

    async deleteDeck(deckId: string): Promise<void> {
        const db = await this.ensure();
        if (getContentDeck(deckId)) return;
        db.decks = db.decks.filter((deck) => deck.id !== deckId);
        const removed = db.cards.filter((card) => card.deckId === deckId);
        db.cards = db.cards.filter((card) => card.deckId !== deckId);
        for (const card of removed) delete db.progress[card.id];
        delete db.cycles[deckId];
        this.persist();
    }

    async listCards(deckId: string, max = 5000): Promise<Card[]> {
        if (getContentDeck(deckId)) {
            const cards = await loadContentCards(deckId);
            return cards.slice(0, max);
        }
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
        const card: Card = {
            ...parsed,
            id: uid(),
            suspended: parsed.suspended ?? false,
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
        delete db.progress[card.id];
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
            db.cards.push({
                ...parsed,
                id: uid(),
                suspended: parsed.suspended ?? false,
                createdAt: now,
                updatedAt: now,
            });
        }

        bumpDeck(db, deckId, inputs.length);
        this.persist();
        onProgress?.(inputs.length, inputs.length);
        return inputs.length;
    }

    async getDeckProgress(deckId: string): Promise<DeckProgress> {
        const db = await this.ensure();
        const deck = await this.getDeck(deckId);
        const total = deck?.cardCount ?? 0;
        const stats = cycleProgress(db.cycles[deckId] ?? null, total);
        return { deckId, level: deck?.level ?? "A1", ...stats };
    }

    async listDeckProgress(): Promise<DeckProgress[]> {
        const decks = await this.listDecks();
        return Promise.all(decks.map((deck) => this.getDeckProgress(deck.id)));
    }

    async getCardTotals(): Promise<CardTotals> {
        const db = await this.ensure();
        const content = listContentDecks(db.profile.activeCourseId);
        const total = content.reduce((sum, deck) => sum + deck.cardCount, 0) + db.cards.length;
        const studied = Object.values(db.cycles).reduce(
            (sum, cycle) => sum + cycle.knownInCycle,
            0,
        );
        return { total, studied };
    }

    async getSession(deckId: string, sessionSize?: number) {
        const db = await this.ensure();
        const deck = await this.getDeck(deckId);
        const cards = await this.listCards(deckId, 20000);
        const size = sessionSize ?? deck?.cardCount ?? cards.length;

        const plan = buildSession({
            deckId,
            cards,
            cycle: db.cycles[deckId] ?? emptyCycle(deckId),
            sessionSize: size,
            shuffle: db.profile.prefs?.shuffleCards ?? false,
        });

        db.cycles[deckId] = {
            ...(db.cycles[deckId] ?? emptyCycle(deckId)),
            cycle: plan.cycle,
            cursor: plan.nextCursor,
            knownInCycle: plan.cycleReset ? 0 : plan.knownInCycle,
            pendingCardIds: plan.pendingLeft,
            lastActivityAt: Date.now(),
            startedAt: plan.cycleReset
                ? Date.now()
                : (db.cycles[deckId]?.startedAt ?? Date.now()),
            completedAt: null,
        };
        this.persist();
        return plan;
    }

    async submitAction({
        card,
        action,
        mode,
        correct,
        durationMs,
        now = new Date(),
    }: SubmitActionArgs): Promise<void> {
        const db = await this.ensure();
        const at = now.getTime();
        const cycle = db.cycles[card.deckId] ?? emptyCycle(card.deckId, at);
        const existing = db.progress[card.id] ?? emptyProgress(card, cycle.cycle);

        const known = action === "next" ? true : existing.known;
        db.progress[card.id] = {
            ...existing,
            cycle: cycle.cycle,
            known,
            repeatsInCycle:
                action === "repeat" ? existing.repeatsInCycle + 1 : 0,
            totalRepeats: existing.totalRepeats + (action === "repeat" ? 1 : 0),
            knownCount: existing.knownCount + (action === "next" ? 1 : 0),
            lastSeenAt: at,
            lastActionAt: at,
        };

        let pending = cycle.pendingCardIds.filter((id) => id !== card.id);
        if (action === "repeat") {
            pending = [...pending, card.id].slice(-MAX_PENDING);
        }

        const knownInCycle =
            action === "next"
                ? Math.min(deckCardCount(db, card.deckId), cycle.knownInCycle + 1)
                : cycle.knownInCycle;

        db.cycles[card.deckId] = {
            ...cycle,
            pendingCardIds: pending,
            knownInCycle,
            lastActivityAt: at,
            completedAt: null,
        };

        db.logs.push({
            cardId: card.id,
            deckId: card.deckId,
            courseId: card.courseId,
            action,
            mode,
            correct,
            durationMs,
            cycle: cycle.cycle,
            createdAt: at,
        });

        const key = dateKey(now);
        const stat = db.dailyStats[key] ?? emptyStat(key);
        db.dailyStats[key] = {
            ...stat,
            reviews: stat.reviews + 1,
            next: stat.next + (action === "next" ? 1 : 0),
            repeat: stat.repeat + (action === "repeat" ? 1 : 0),
            known: stat.known + (action === "next" ? 1 : 0),
            studyMs: stat.studyMs + Math.max(0, Math.round(durationMs)),
            quizCorrect: stat.quizCorrect + (mode === "quiz" && correct ? 1 : 0),
            quizTotal: stat.quizTotal + (mode === "quiz" ? 1 : 0),
        };

        this.persist();
    }

    async resetDeckCycle(deckId: string): Promise<void> {
        const db = await this.ensure();
        db.cycles[deckId] = {
            ...emptyCycle(deckId),
            startedAt: Date.now(),
            lastActivityAt: Date.now(),
        };
        for (const card of await this.listCards(deckId, 20000)) {
            if (db.progress[card.id]) {
                db.progress[card.id] = {
                    ...db.progress[card.id],
                    known: false,
                    repeatsInCycle: 0,
                };
            }
        }
        this.persist();
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

function deckCardCount(db: GuestDb, deckId: string): number {
    if (getContentDeck(deckId)) {
        return getContentDeck(deckId)?.cardCount ?? 0;
    }
    const deck = db.decks.find((entry) => entry.id === deckId);
    return deck?.cardCount ?? 0;
}

/**
 * Remaps progress created for the old per-level decks (`de-a1-core-0001`) to
 * the new topic deck ids (`de-a1-greetings-0001`). Progress that belongs to
 * user decks is left untouched.
 */
async function remapTopics(db: GuestDb): Promise<void> {
    const [topicMap, coreMap] = await Promise.all([
        import("@/content/topic-map.json").then(
            (module) => module.default as Record<string, string>,
        ),
        import("@/content/migration-map.json").then(
            (module) => module.default as Record<string, string>,
        ),
    ]);

    const progress: Record<string, CardProgress> = {};
    const knownByDeck = new Map<string, number>();
    const pendingByDeck = new Map<string, string[]>();
    const seenByDeck = new Map<string, number>();

    for (const [oldId, entry] of Object.entries(db.progress)) {
        const target =
            topicMap[oldId] ??
            (coreMap[oldId] ? (topicMap[coreMap[oldId]] ?? null) : null);
        if (!target) {
            // User-deck card: keep as is.
            if (!getContentDeck(entry.deckId)) progress[oldId] = entry;
            continue;
        }

        const deckId = target.replace(/-\d{4}$/, "");
        progress[target] = { ...entry, cardId: target, deckId };
        seenByDeck.set(deckId, (seenByDeck.get(deckId) ?? 0) + 1);
        if (entry.known) {
            knownByDeck.set(deckId, (knownByDeck.get(deckId) ?? 0) + 1);
        } else {
            const list = pendingByDeck.get(deckId) ?? [];
            list.push(target);
            pendingByDeck.set(deckId, list);
        }
    }

    const cycles: Record<string, DeckCycle> = {};
    for (const [deckId, cycle] of Object.entries(db.cycles)) {
        if (!getContentDeck(deckId)) cycles[deckId] = cycle;
    }
    for (const [deckId, seen] of seenByDeck) {
        const deck = getContentDeck(deckId);
        if (!deck) continue;
        cycles[deckId] = {
            ...emptyCycle(deckId),
            cursor: Math.min(deck.cardCount, seen),
            knownInCycle: Math.min(deck.cardCount, knownByDeck.get(deckId) ?? 0),
            pendingCardIds: (pendingByDeck.get(deckId) ?? []).slice(0, 200),
        };
    }

    db.progress = progress;
    db.cycles = cycles;
    db.contentVersion = 4;
}

/** Converts the FSRS-era snapshot (v1) into the cycle model (v2). */
function migrateLegacyGuest(): GuestDb | null {
    if (typeof window === "undefined") return null;

    let legacy: {
        profile?: Partial<Profile>;
        decks?: Deck[];
        cards?: (Card & { isNew?: boolean })[];
        dailyStats?: Record<string, DailyStat>;
    } | null = null;

    try {
        const raw = window.localStorage.getItem(LEGACY_GUEST_STORAGE_KEY);
        if (!raw) return null;
        legacy = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!legacy) return null;

    const now = Date.now();
    const progress: Record<string, CardProgress> = {};
    const cycles: Record<string, DeckCycle> = {};
    const cards: Card[] = [];

    for (const old of legacy.cards ?? []) {
        const isSeed = old.deckId === LEGACY_SEED_DECK_ID;
        const suffix = old.id.split("-").pop() ?? "";
        const cardId = isSeed ? `${SEED_DECK_ID}-${suffix}` : old.id;
        const deckId = isSeed ? SEED_DECK_ID : old.deckId;
        const known = !old.isNew;

        if (!isSeed) {
            cards.push({
                ...old,
                id: cardId,
                deckId,
                suspended: Boolean(old.suspended),
            });
        }

        progress[cardId] = {
            cardId,
            deckId,
            courseId: old.courseId ?? "de",
            cycle: 1,
            known,
            repeatsInCycle: 0,
            totalRepeats: 0,
            knownCount: known ? 1 : 0,
            lastSeenAt: now,
            lastActionAt: now,
        };

        const cycle = cycles[deckId] ?? emptyCycle(deckId, now);
        const position = Number(suffix);
        cycles[deckId] = {
            ...cycle,
            cursor: Math.max(cycle.cursor, Number.isFinite(position) ? position : 0),
            knownInCycle: cycle.knownInCycle + (known ? 1 : 0),
            lastActivityAt: now,
        };
    }

    const userDecks = (legacy.decks ?? [])
        .filter((deck) => deck.id !== LEGACY_SEED_DECK_ID)
        .map((deck) => ({
            ...deck,
            source: "user" as const,
            readOnly: false,
        }));

    const profile = {
        ...defaultProfileFor({
            displayName: legacy.profile?.displayName ?? null,
            email: legacy.profile?.email ?? null,
            uiLocale: legacy.profile?.uiLocale ?? "id",
        }),
        ...legacy.profile,
        bands: normalizeBands(legacy.profile?.bands),
        engineV2: true,
    } as Profile;

    window.localStorage.removeItem(LEGACY_GUEST_STORAGE_KEY);

    return {
        version: 2,
        profile,
        decks: userDecks,
        cards,
        progress,
        cycles,
        logs: [],
        dailyStats: legacy.dailyStats ?? {},
    };
}

/** Percent helper re-exported for UI code that only has counts. */
export { progressPercent };
