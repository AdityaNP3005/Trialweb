import { writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import {
    cardDocRef,
    dailyStatDocRef,
    deckDocRef,
} from "@/lib/firebase/paths";
import { clearGuestSnapshot, readGuestSnapshot } from "./local-store";

/**
 * Moves guest (localStorage) decks, cards and daily stats into the account
 * right after the first sign-in, so progress is not lost.
 *
 * Only runs when the cloud account has no decks yet — otherwise nothing is
 * touched, to avoid overwriting existing cloud progress.
 */
export async function migrateGuestData(
    uid: string,
    cloudDeckCount: number,
): Promise<boolean> {
    if (cloudDeckCount > 0) return false;

    const guest = readGuestSnapshot();
    if (!guest) return false;
    if (guest.decks.length === 0 && guest.cards.length === 0) return false;

    const now = Date.now();

    for (const deck of guest.decks) {
        const batch = writeBatch(getDb());
        batch.set(
            deckDocRef(uid, deck.id),
            { ...deck, updatedAt: now },
            { merge: true },
        );
        await batch.commit();
    }

    for (let index = 0; index < guest.cards.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const card of guest.cards.slice(index, index + 400)) {
            batch.set(cardDocRef(uid, card.id), card, { merge: true });
        }
        await batch.commit();
    }

    const statKeys = Object.keys(guest.dailyStats);
    for (let index = 0; index < statKeys.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const key of statKeys.slice(index, index + 400)) {
            batch.set(dailyStatDocRef(uid, key), guest.dailyStats[key], {
                merge: true,
            });
        }
        await batch.commit();
    }

    clearGuestSnapshot();
    return true;
}
