import { getDocs, setDoc, writeBatch } from "firebase/firestore";
import type { CardProgress, Profile } from "@/types";
import { getDb } from "@/lib/firebase/client";
import { deckCycleDocRef, progressColRef, progressDocRef, userDocRef } from "@/lib/firebase/paths";
import { fetchAllCycles } from "@/lib/data/progress";
import { consolidateReviewedProgress, loadReviewedGermanCards } from "@/lib/content/review-progress";

/** Run after the older topic migration, once per account; safe to retry. */
export async function migrateReviewedVocab(uid: string, profile: Profile | null): Promise<boolean> {
    if (!profile?.topicsV4 || profile.vocabV5) return false;
    const [snapshot, cycles, cards, aliases] = await Promise.all([
        getDocs(progressColRef(uid)), fetchAllCycles(uid), loadReviewedGermanCards(),
        import("@/content/de/review-aliases.json").then((module) => module.default),
    ]);
    const original = snapshot.docs.map((doc) => ({ ...doc.data(), cardId: doc.id }) as CardProgress);
    const reviewed = consolidateReviewedProgress(original, cycles, cards, aliases);
    const germanIds = new Set(cards.map((card) => card.id));
    const entries = reviewed.progress.filter((entry) => germanIds.has(entry.cardId));
    for (let index = 0; index < entries.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const entry of entries.slice(index, index + 400)) {
            batch.set(progressDocRef(uid, entry.cardId), entry, { merge: true });
        }
        await batch.commit();
    }
    const oldIds = original.filter((entry) => entry.cardId in aliases).map((entry) => entry.cardId);
    for (let index = 0; index < oldIds.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const id of oldIds.slice(index, index + 400)) batch.delete(progressDocRef(uid, id));
        await batch.commit();
    }
    const changedCycles = reviewed.cycles.filter((cycle) => cycle.vocabV5);
    for (let index = 0; index < changedCycles.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const cycle of changedCycles.slice(index, index + 400)) {
            batch.set(deckCycleDocRef(uid, cycle.deckId), cycle, { merge: true });
        }
        await batch.commit();
    }
    await setDoc(userDocRef(uid), { vocabV5: true }, { merge: true });
    return true;
}
