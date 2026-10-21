import { deleteDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";
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

/**
 * Remaps progress to the currently shipped topic card ids.
 *
 * Handles both generations at once:
 * - `migration-map.json`: `de-a1-core-0001` → old topic id
 * - `topic-map.json`:     old topic id      → current topic id
 *
 * Cards that were marked as known stay in the pending list of their new topic,
 * so they are shown first instead of being dropped. Cards that no longer exist
 * in the content (removed names, trimmed levels) lose their progress.
 */
export async function migrateTopicProgress(
    uid: string,
    profile: Profile | null,
): Promise<boolean> {
    if (!profile || profile.topicsV4 === true) return false;

    const snapshot = await getDocs(progressColRef(uid));
    if (snapshot.empty) {
        await setDoc(
            userDocRef(uid),
            { topicsV3: true, topicsV4: true },
            { merge: true },
        );
        return false;
    }

    const [topicMap, coreMap] = await Promise.all([
        import("@/content/topic-map.json").then(
            (module) => module.default as Record<string, string>,
        ),
        import("@/content/migration-map.json").then(
            (module) => module.default as Record<string, string>,
        ),
    ]);

    const entries = new Map<string, CardProgress>();
    const stale = new Set<string>();

    for (const doc of snapshot.docs) {
        const data = doc.data() as CardProgress;
        const target =
            topicMap[doc.id] ??
            (coreMap[doc.id] ? (topicMap[coreMap[doc.id]] ?? null) : null);

        if (!target) {
            if (getContentDeck(data.deckId)) {
                // Card disappeared from the bundled content.
                stale.add(doc.id);
            } else {
                // User deck: keep untouched.
                entries.set(doc.id, data);
            }
            continue;
        }

        const deckId = target.replace(/-\d{4}$/, "");
        entries.set(target, { ...data, cardId: target, deckId });
        if (doc.id !== target) stale.add(doc.id);
    }

    for (let index = 0; index < entries.size; index += 400) {
        const chunk = [...entries.values()].slice(index, index + 400);
        const batch = writeBatch(getDb());
        for (const entry of chunk) {
            batch.set(progressDocRef(uid, entry.cardId), entry, { merge: true });
        }
        await batch.commit();
    }

    const staleIds = [...stale];
    for (let index = 0; index < staleIds.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const id of staleIds.slice(index, index + 400)) {
            batch.delete(progressDocRef(uid, id));
        }
        await batch.commit();
    }

    const knownByDeck = new Map<string, number>();
    const pendingByDeck = new Map<string, string[]>();
    const seenByDeck = new Map<string, number>();

    for (const entry of entries.values()) {
        const deck = getContentDeck(entry.deckId);
        if (!deck) continue;
        seenByDeck.set(deck.id, (seenByDeck.get(deck.id) ?? 0) + 1);
        if (entry.known) {
            knownByDeck.set(deck.id, (knownByDeck.get(deck.id) ?? 0) + 1);
        } else {
            const list = pendingByDeck.get(deck.id) ?? [];
            list.push(entry.cardId);
            pendingByDeck.set(deck.id, list);
        }
    }

    const cycles = await getDocs(deckCyclesColRef(uid));
    for (const doc of cycles.docs) {
        if (doc.id.startsWith("de-")) await deleteDoc(doc.ref);
    }

    for (const deckId of seenByDeck.keys()) {
        const deck = getContentDeck(deckId);
        if (!deck) continue;
        const cycle: DeckCycle = {
            ...emptyCycle(deckId),
            cursor: Math.min(deck.cardCount, seenByDeck.get(deckId) ?? 0),
            knownInCycle: Math.min(deck.cardCount, knownByDeck.get(deckId) ?? 0),
            pendingCardIds: (pendingByDeck.get(deckId) ?? []).slice(0, 200),
        };
        await setDoc(deckCycleDocRef(uid, deckId), cycle, { merge: true });
    }

    await setDoc(
        userDocRef(uid),
        { topicsV3: true, topicsV4: true },
        { merge: true },
    );
    return true;
}
