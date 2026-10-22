import { writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import {
    cardDocRef,
    dailyStatDocRef,
    deckCycleDocRef,
    deckDocRef,
    progressDocRef,
    userDocRef,
} from "@/lib/firebase/paths";
import type { Profile } from "@/types";
import { fetchProfile, patchProfile } from "@/lib/data/profile";
import { fetchVideoProgress, saveVideoProgress } from "@/lib/data/videos";
import { saveWrittenCharacters } from "@/lib/data/writing";
import { mergePlaylistProgress } from "@/lib/video/progress";
import { clearGuestSnapshot, GuestStore, readGuestSnapshot } from "./local-store";

/**
 * Moves guest (localStorage) user decks, progress and daily stats into the
 * account right after the first sign-in, so progress is not lost.
 *
 * Bundled content decks are not copied — only their progress/cycle documents.
 * Runs only when the cloud account has no user decks yet.
 */
export async function migrateGuestData(
    uid: string,
    cloudDeckCount: number,
): Promise<boolean> {
    if (cloudDeckCount > 0) return false;

    let guest = readGuestSnapshot();
    if (!guest) return false;
    if (guest.decks.length === 0 && Object.keys(guest.progress).length === 0) {
        return false;
    }
    // Cloud and guest histories must use the same layout before they merge.
    // In particular, do not run a legacy positional remap on v6 card ids.
    const profile = await fetchProfile(uid);
    if (!profile?.topicsV6) return false;
    await new GuestStore(guest.profile.uiLocale).getProfile();
    guest = readGuestSnapshot();
    if (!guest) return false;

    const now = Date.now();

    for (const deck of guest.decks) {
        const batch = writeBatch(getDb());
        batch.set(deckDocRef(uid, deck.id), { ...deck, updatedAt: now }, { merge: true });
        await batch.commit();
    }

    for (let index = 0; index < guest.cards.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const card of guest.cards.slice(index, index + 400)) {
            batch.set(cardDocRef(uid, card.id), card, { merge: true });
        }
        await batch.commit();
    }

    const progressEntries = Object.values(guest.progress);
    for (let index = 0; index < progressEntries.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const entry of progressEntries.slice(index, index + 400)) {
            batch.set(progressDocRef(uid, entry.cardId), entry, { merge: true });
        }
        await batch.commit();
    }

    for (const cycle of Object.values(guest.cycles)) {
        await writeBatch(getDb())
            .set(deckCycleDocRef(uid, cycle.deckId), cycle, { merge: true })
            .commit();
    }

    const statKeys = Object.keys(guest.dailyStats);
    for (let index = 0; index < statKeys.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const key of statKeys.slice(index, index + 400)) {
            batch.set(dailyStatDocRef(uid, key), guest.dailyStats[key], { merge: true });
        }
        await batch.commit();
    }

    await writeBatch(getDb())
        .set(userDocRef(uid), { bands: guest.profile.bands, engineV2: true }, { merge: true })
        .commit();

    clearGuestSnapshot();
    return true;
}

/**
 * Merges guest video watching into the account. Runs separately from the deck
 * migration because accounts that already own decks would otherwise skip it,
 * and because it must run before `migrateGuestData` clears the snapshot.
 */
export async function migrateGuestVideos(
    uid: string,
    profile?: Profile | null,
): Promise<boolean> {
    const current = profile ?? (await fetchProfile(uid).catch(() => null));
    if (current?.videosV1) return false;

    const guest = readGuestSnapshot();
    const guestVideos = guest?.videos ?? {};

    for (const [playlistId, guestProgress] of Object.entries(guestVideos)) {
        const cloud = await fetchVideoProgress(uid, playlistId).catch(() => null);
        const merged = mergePlaylistProgress(guestProgress, cloud);
        if (merged) {
            await saveVideoProgress(uid, { ...merged, playlistId }).catch(() => { });
        }
    }

    await patchProfile(uid, { videosV1: true }).catch(() => { });
    return true;
}

/**
 * Copies guest writing practice into the account. `arrayUnion` makes it safe to
 * run on every sign-in; the snapshot is gone once `migrateGuestData` clears it.
 */
export async function migrateGuestWriting(uid: string): Promise<void> {
    const writing = readGuestSnapshot()?.writing ?? {};
    for (const [courseId, chars] of Object.entries(writing)) {
        await saveWrittenCharacters(uid, courseId, chars).catch(() => { });
    }
}
