import { getDocs, setDoc, writeBatch } from "firebase/firestore";
import type { CardProgress, DeckCycle, Profile } from "@/types";
import { getDb } from "@/lib/firebase/client";
import {
    cardsColRef,
    deckCycleDocRef,
    progressDocRef,
    userDocRef,
} from "@/lib/firebase/paths";
import { emptyCycle } from "@/lib/study/session";

const LEGACY_SEED_DECK_ID = "de-a1-core-seed";
const SEED_DECK_ID = "de-a1-core";

/**
 * One-time upgrade from the FSRS data model:
 * - cards copied per account (`users/{uid}/cards` with `srs`) become progress
 *   documents keyed by the new bundled card ids,
 * - a card counts as "known" when it had at least one review,
 * - the legacy document set is left untouched (harmless, and a safety net).
 *
 * Returns true when something was written.
 */
export async function migrateLegacyEngine(
    uid: string,
    profile: Profile | null,
): Promise<boolean> {
    if (!profile) return false;
    if (profile.engineV2 === true) return false;

    const snapshot = await getDocs(cardsColRef(uid));
    if (snapshot.empty) {
        await setDoc(userDocRef(uid), { engineV2: true }, { merge: true });
        return false;
    }

    const now = Date.now();
    const cycles = new Map<string, DeckCycle>();
    const progress: CardProgress[] = [];

    for (const entry of snapshot.docs) {
        const data = entry.data() as {
            deckId?: string;
            courseId?: string;
            isNew?: boolean;
            srs?: { reps?: number };
        };
        const legacyDeckId = data.deckId ?? "";
        const isSeed = legacyDeckId === LEGACY_SEED_DECK_ID;
        const deckId = isSeed ? SEED_DECK_ID : legacyDeckId;
        if (!deckId) continue;

        const suffix = entry.id.split("-").pop() ?? "";
        const cardId = isSeed ? `${SEED_DECK_ID}-${suffix}` : entry.id;
        const known = data.isNew === false || (data.srs?.reps ?? 0) > 0;

        progress.push({
            cardId,
            deckId,
            courseId: data.courseId ?? "de",
            cycle: 1,
            known,
            repeatsInCycle: 0,
            totalRepeats: 0,
            knownCount: known ? 1 : 0,
            lastSeenAt: now,
            lastActionAt: now,
        });

        const cycle = cycles.get(deckId) ?? emptyCycle(deckId, now);
        const position = Number(suffix);
        cycles.set(deckId, {
            ...cycle,
            cursor: Math.max(cycle.cursor, Number.isFinite(position) ? position : 0),
            knownInCycle: cycle.knownInCycle + (known ? 1 : 0),
            lastActivityAt: now,
        });
    }

    for (let index = 0; index < progress.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const entry of progress.slice(index, index + 400)) {
            batch.set(progressDocRef(uid, entry.cardId), entry, { merge: true });
        }
        await batch.commit();
    }

    for (const cycle of cycles.values()) {
        await setDoc(deckCycleDocRef(uid, cycle.deckId), cycle, { merge: true });
    }

    await setDoc(userDocRef(uid), { engineV2: true }, { merge: true });
    return true;
}

/** Marks accounts without any card documents as migrated. */
export async function markEngineMigrated(uid: string): Promise<void> {
    await setDoc(userDocRef(uid), { engineV2: true }, { merge: true });
}
