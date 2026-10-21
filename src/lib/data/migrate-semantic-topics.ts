import { getDocs, setDoc, writeBatch } from "firebase/firestore";
import type { CardProgress, Profile } from "@/types";
import { getDb } from "@/lib/firebase/client";
import { deckCycleDocRef, progressColRef, progressDocRef, userDocRef } from "@/lib/firebase/paths";
import { fetchAllCycles } from "@/lib/data/progress";
import { loadReviewedGermanCards } from "@/lib/content/review-progress";
import { reclassifyTopicProgress } from "@/lib/content/topic-progress";

/** A deck's progress and migration marker are committed together for safe retries. */
export async function migrateSemanticTopics(uid: string, profile: Profile | null): Promise<boolean> {
    if (!profile?.vocabV5 || profile.topicsV6) return false;
    const [snapshot, cycles, cards, layout] = await Promise.all([
        getDocs(progressColRef(uid)), fetchAllCycles(uid), loadReviewedGermanCards(),
        import("@/content/topic-map-v6.json").then((module) => module.default.fromDecks),
    ]);
    const original = snapshot.docs.map((doc) => ({ ...doc.data(), cardId: doc.id }) as CardProgress);
    const next = reclassifyTopicProgress(original, cycles, cards, layout);
    const alreadyMigrated = new Set(cycles.filter((cycle) => cycle.topicsV6).map((cycle) => cycle.deckId));
    for (const cycle of next.cycles) {
        if (!cycle.topicsV6 || alreadyMigrated.has(cycle.deckId)) continue;
        const entries = next.progress.filter((entry) => entry.deckId === cycle.deckId);
        // Semantic topics contain at most 80 cards: this batch is below 500 writes.
        const batch = writeBatch(getDb());
        for (const entry of entries) batch.set(progressDocRef(uid, entry.cardId), entry, { merge: true });
        batch.set(deckCycleDocRef(uid, cycle.deckId), cycle, { merge: true });
        await batch.commit();
    }
    for (let index = 0; index < next.retiredDeckIds.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const deckId of next.retiredDeckIds.slice(index, index + 400)) batch.delete(deckCycleDocRef(uid, deckId));
        await batch.commit();
    }
    await setDoc(userDocRef(uid), { topicsV6: true }, { merge: true });
    return true;
}
