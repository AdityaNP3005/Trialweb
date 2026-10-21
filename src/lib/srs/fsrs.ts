import {
    createEmptyCard,
    fsrs,
    generatorParameters,
    Rating,
    State,
    type Card as FsrsCard,
} from "ts-fsrs";
import type { ReviewRating, SrsState } from "@/types";

/**
 * Client-side scheduler. FSRS keeps no server state, so the same parameters
 * must be used everywhere a card is scheduled.
 */
export const scheduler = fsrs(
    generatorParameters({
        request_retention: 0.9,
        maximum_interval: 36500,
        enable_fuzz: true,
        enable_short_term: true,
        learning_steps: ["1m", "10m"],
        relearning_steps: ["10m"],
    }),
);

export { Rating, State };

export function newSrsState(now: number = Date.now()): SrsState {
    const card = createEmptyCard(new Date(now));
    return {
        state: card.state,
        dueMs: card.due.getTime(),
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsed_days,
        scheduledDays: card.scheduled_days,
        learningSteps: card.learning_steps,
        reps: card.reps,
        lapses: card.lapses,
        lastReviewMs: card.last_review ? card.last_review.getTime() : null,
    };
}

export function toFsrsCard(srs: SrsState): FsrsCard {
    return {
        due: new Date(srs.dueMs),
        stability: srs.stability,
        difficulty: srs.difficulty,
        elapsed_days: srs.elapsedDays,
        scheduled_days: srs.scheduledDays,
        learning_steps: srs.learningSteps ?? 0,
        reps: srs.reps,
        lapses: srs.lapses,
        state: srs.state as unknown as State,
        last_review:
            srs.lastReviewMs === null ? undefined : new Date(srs.lastReviewMs),
    };
}

export function fromFsrsCard(card: FsrsCard): SrsState {
    return {
        state: card.state,
        dueMs: card.due.getTime(),
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsed_days,
        scheduledDays: card.scheduled_days,
        learningSteps: card.learning_steps,
        reps: card.reps,
        lapses: card.lapses,
        lastReviewMs: card.last_review ? card.last_review.getTime() : null,
    };
}

export type IntervalPreview = Record<
    ReviewRating,
    { dueMs: number; label: string }
>;

/** Interval preview for the four rating buttons. */
export function previewIntervals(
    srs: SrsState,
    now: Date = new Date(),
): IntervalPreview {
    const preview = scheduler.repeat(toFsrsCard(srs), now) as unknown as Record<
        number,
        { card: FsrsCard }
    >;

    const build = (rating: ReviewRating) => {
        const dueMs = preview[rating].card.due.getTime();
        return { dueMs, label: formatInterval(dueMs - now.getTime()) };
    };

    return {
        1: build(Rating.Again),
        2: build(Rating.Hard),
        3: build(Rating.Good),
        4: build(Rating.Easy),
    };
}

export function formatInterval(ms: number): string {
    const minute = 60_000;
    const hour = 3_600_000;
    const day = 86_400_000;

    if (ms < minute) return `${Math.max(1, Math.round(ms / 1000))}s`;
    if (ms < hour) return `${Math.round(ms / minute)}m`;
    if (ms < day) return `${Math.round(ms / hour)}h`;
    if (ms < 30 * day) return `${Math.round(ms / day)}d`;
    if (ms < 365 * day) return `${Math.round(ms / (30 * day))}mo`;
    return `${Math.round(ms / (365 * day))}y`;
}

export type ScheduledReview = {
    srs: SrsState;
    log: {
        rating: ReviewRating;
        stateBefore: number;
        stateAfter: number;
        dueMs: number;
        stability: number;
        difficulty: number;
        elapsedDays: number;
        scheduledDays: number;
        reviewMs: number;
    };
};

/** Applies one rating and returns the new persisted SRS state plus a log row. */
export function scheduleReview(
    srs: SrsState,
    rating: ReviewRating,
    now: Date = new Date(),
): ScheduledReview {
    const result = scheduler.next(toFsrsCard(srs), now, rating);
    const nextSrs = fromFsrsCard(result.card);

    return {
        srs: nextSrs,
        log: {
            rating,
            stateBefore: srs.state,
            stateAfter: nextSrs.state,
            dueMs: nextSrs.dueMs,
            stability: nextSrs.stability,
            difficulty: nextSrs.difficulty,
            elapsedDays: nextSrs.elapsedDays,
            scheduledDays: nextSrs.scheduledDays,
            reviewMs: now.getTime(),
        },
    };
}
