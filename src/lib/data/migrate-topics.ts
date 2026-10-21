import {
    deleteDoc,
    getDocs,
    setDoc,
    writeBatch,
} from "firebase/firestore";
import type { CardProgress, DeckCycle, Profile } from "@/types";
import { getDb } from "@/lib/firebase/client";
import {
    deckCycleDocRef,
    deckCyclesColRef,
    progressColRef,
    progressDocRef,
    userDocRef,
} from "@/lib/firebase/paths";
import { getContentDeck } from "@/lib/content/registry";
import { emptyCycle } from "@/lib/study/session";

const OLD_DECK_PATTERN = /^de-[a-z0-9]+-core$/;

/**
 * One-time remap from the old per-level decks (`de-a1-core-0001`) to the topic
 * decks (`de-a1-greetings-0001`).
 *
 * Cards that were marked as known are kept as `pending` for their new topic, so
 * they are shown first in the next session instead of being silently dropped.
 * Old progress/cycle documents are removed afterwards.
 */
export async function migrateTopicProgress(
    uid: string,
    profile: Profile | null,
): Promise<boolean> {
    if (!profile || profile.topicsV3 === true) return false;

    const snapshot = await getDocs(progressColRef(uid));
    if (snapshot.empty) {
        await setDoc(userDocRef(uid), { topicsV3: true }, { merge: true });
        return false;
    }

    const map = (await import("@/content/migration-map.json"))
        .default as Record<string, string>;

    const knownByDeck = new Map<string, string[]>();
    const newProgress: CardProgress[] = [];
    const staleRefs = snapshot.docs.map((entry) => entry.ref);

    for (const entry of snapshot.docs) {
        const data = entry.data() as CardProgress;
        const newId = map[entry.id];
        if (!newId) {
            // Card belongs to a user deck: keep its progress untouched.
            if (!getContentDeck(data.deckId)) {
                staleRefs.splice(staleRefs.indexOf(entry.ref), 1);
            }
            continue;
        }

        const deckId = newId.replace(/-\d{4}$/, "");
        newProgress.push({ ...data, cardId: newId, deckId, cycle: 1 });
        if (data.known) {
            const list = knownByDeck.get(deckId) ?? [];
            list.push(newId);
            knownByDeck.set(deckId, list);
        }
    }

    for (let index = 0; index < newProgress.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const entry of newProgress.slice(index, index + 400)) {
            batch.set(progressDocRef(uid, entry.cardId), entry, { merge: true });
        }
        await batch.commit();
    }

    for (const [deckId, knownIds] of knownByDeck) {
        const deck = getContentDeck(deckId);
        if (!deck) continue;
        const cycle: DeckCycle = {
            ...emptyCycle(deckId),
            pendingCardIds: knownIds.slice(0, 200),
        };
        await setDoc(deckCycleDocRef(uid, deckId), cycle, { merge: true });
    }

    // Remove the old per-level progress documents and cycle cursors.
    for (let index = 0; index < staleRefs.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const ref of staleRefs.slice(index, index + 400)) batch.delete(ref);
        await batch.commit();
    }

    const cycles = await getDocs(deckCyclesColRef(uid));
    for (const entry of cycles.docs) {
        if (OLD_DECK_PATTERN.test(entry.id)) await deleteDoc(entry.ref);
    }

    await setDoc(userDocRef(uid), { topicsV3: true }, { merge: true });
    return true;
}
