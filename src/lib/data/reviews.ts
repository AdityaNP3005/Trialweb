import { doc, increment, writeBatch } from "firebase/firestore";
import type { Card, ReviewRating, SrsState, StudyMode } from "@/types";
import {
    cardDocRef,
    dailyStatDocRef,
    reviewsColRef,
} from "@/lib/firebase/paths";
import { getDb } from "@/lib/firebase/client";
import { scheduleReview } from "@/lib/srs/fsrs";
import { dateKey } from "@/lib/utils/date";

const ratingFields = ["again", "hard", "good", "easy"] as const;

export type SubmitReviewArgs = {
    uid: string;
    card: Card;
    rating: ReviewRating;
    mode: StudyMode;
    correct: boolean;
    durationMs: number;
    now?: Date;
};

/**
 * Schedules the card with FSRS and atomically writes:
 * card state, review log entry and daily counters.
 */
export async function submitReview({
    uid,
    card,
    rating,
    mode,
    correct,
    durationMs,
    now = new Date(),
}: SubmitReviewArgs): Promise<SrsState> {
    const reviewedAt = now.getTime();
    const { srs, log } = scheduleReview(card.srs, rating, now);
    const key = dateKey(now);
    const ratingField = ratingFields[rating - 1];

    const batch = writeBatch(getDb());

    batch.update(cardDocRef(uid, card.id), {
        srs,
        dueMs: srs.dueMs,
        isNew: false,
        updatedAt: reviewedAt,
    });

    batch.set(doc(reviewsColRef(uid)), {
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
        createdAt: reviewedAt,
    });

    batch.set(
        dailyStatDocRef(uid, key),
        {
            date: key,
            reviews: increment(1),
            [ratingField]: increment(1),
            newCards: increment(card.isNew ? 1 : 0),
            studyMs: increment(Math.max(0, Math.round(durationMs))),
            quizCorrect: increment(mode === "quiz" && correct ? 1 : 0),
            quizTotal: increment(mode === "quiz" ? 1 : 0),
            updatedAt: reviewedAt,
        },
        { merge: true },
    );

    await batch.commit();
    return srs;
}
