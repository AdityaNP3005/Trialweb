import {
    addDoc,
    arrayRemove,
    arrayUnion,
    getDoc,
    getDocs,
    increment,
    setDoc,
    writeBatch,
} from "firebase/firestore";
import type { Card, DeckCycle, StudyAction, StudyMode } from "@/types";
import { getDb } from "@/lib/firebase/client";
import {
    dailyStatDocRef,
    deckCycleDocRef,
    deckCyclesColRef,
    progressDocRef,
    reviewsColRef,
} from "@/lib/firebase/paths";
import { dateKey } from "@/lib/utils/date";

export type SubmitActionArgs = {
    uid: string;
    card: Card;
    action: StudyAction;
    mode: StudyMode;
    correct: boolean;
    durationMs: number;
    cycle?: number;
    now?: Date;
};

export async function fetchDeckCycle(
    uid: string,
    deckId: string,
): Promise<DeckCycle | null> {
    const snapshot = await getDoc(deckCycleDocRef(uid, deckId));
    if (!snapshot.exists()) return null;
    return { ...(snapshot.data() as Omit<DeckCycle, "deckId">), deckId };
}

export async function fetchAllCycles(uid: string): Promise<DeckCycle[]> {
    const snapshot = await getDocs(deckCyclesColRef(uid));
    return snapshot.docs.map((entry) => ({
        ...(entry.data() as Omit<DeckCycle, "deckId">),
        deckId: entry.id,
    }));
}

/** Persists the cursor/cycle decided by `buildSession`. */
export async function saveDeckCycle(uid: string, cycle: DeckCycle): Promise<void> {
    await setDoc(deckCycleDocRef(uid, cycle.deckId), cycle, { merge: true });
}

export async function deleteDeckCycle(uid: string, deckId: string): Promise<void> {
    const batch = writeBatch(getDb());
    batch.delete(deckCycleDocRef(uid, deckId));
    await batch.commit();
}

/**
 * Records one answer. Uses `increment`/`arrayUnion`/`arrayRemove` so the call
 * needs no read and concurrent tabs cannot clobber each other's counters.
 */
export async function submitAction({
    uid,
    card,
    action,
    mode,
    correct,
    durationMs,
    cycle = 1,
    now = new Date(),
}: SubmitActionArgs): Promise<void> {
    const at = now.getTime();
    const batch = writeBatch(getDb());

    batch.set(
        progressDocRef(uid, card.id),
        {
            cardId: card.id,
            deckId: card.deckId,
            courseId: card.courseId,
            cycle,
            known: action === "next",
            repeatsInCycle: action === "repeat" ? increment(1) : 0,
            totalRepeats: increment(action === "repeat" ? 1 : 0),
            knownCount: increment(action === "next" ? 1 : 0),
            lastSeenAt: at,
            lastActionAt: at,
        },
        { merge: true },
    );

    batch.set(
        deckCycleDocRef(uid, card.deckId),
        {
            deckId: card.deckId,
            pendingCardIds:
                action === "repeat" ? arrayUnion(card.id) : arrayRemove(card.id),
            knownInCycle: increment(action === "next" ? 1 : 0),
            lastActivityAt: at,
            completedAt: null,
        },
        { merge: true },
    );

    batch.set(
        dailyStatDocRef(uid, dateKey(now)),
        {
            date: dateKey(now),
            reviews: increment(1),
            next: increment(action === "next" ? 1 : 0),
            repeat: increment(action === "repeat" ? 1 : 0),
            known: increment(action === "next" ? 1 : 0),
            studyMs: increment(Math.max(0, Math.round(durationMs))),
            quizCorrect: increment(mode !== "flashcard" && correct ? 1 : 0),
            quizTotal: increment(mode !== "flashcard" ? 1 : 0),
            // Same activity, split by language; the totals above stay combined.
            // Nested maps (not dotted keys) so `set(..., { merge: true })` deep-merges.
            byCourse: {
                [card.courseId]: {
                    reviews: increment(1),
                    next: increment(action === "next" ? 1 : 0),
                    repeat: increment(action === "repeat" ? 1 : 0),
                    known: increment(action === "next" ? 1 : 0),
                    studyMs: increment(Math.max(0, Math.round(durationMs))),
                    quizCorrect: increment(mode !== "flashcard" && correct ? 1 : 0),
                    quizTotal: increment(mode !== "flashcard" ? 1 : 0),
                },
            },
            updatedAt: at,
        },
        { merge: true },
    );

    await batch.commit();

    await addDoc(reviewsColRef(uid), {
        cardId: card.id,
        deckId: card.deckId,
        courseId: card.courseId,
        action,
        mode,
        correct,
        durationMs,
        cycle,
        createdAt: at,
    });
}
