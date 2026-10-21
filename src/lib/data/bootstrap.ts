import type { User } from "firebase/auth";
import { setDoc, writeBatch } from "firebase/firestore";
import type { Profile } from "@/types";
import { cardDocRef, deckDocRef, userDocRef } from "@/lib/firebase/paths";
import { getDb } from "@/lib/firebase/client";
import { defaultProfile, fetchProfile } from "./profile";
import { loadSeed, type SeedCard } from "./seedLoader";
import { newSrsState } from "@/lib/srs/fsrs";

export const SEED_DECK_SUFFIX = "seed";

/**
 * Creates the profile and copies the starter deck into the user's Firestore
 * subtree on first sign-in. Document ids are deterministic, so re-running this
 * (second tab, retry) updates the same documents instead of duplicating them.
 */
export async function ensureUserBootstrap(
    user: User,
    uiLocale: "id" | "en",
): Promise<Profile> {
    const existing = await fetchProfile(user.uid);

    if (existing?.onboardingComplete) {
        return existing;
    }

    const profile =
        existing ??
        defaultProfile({
            displayName: user.displayName,
            email: user.email,
            uiLocale,
        });

    await setDoc(userDocRef(user.uid), profile, { merge: true });

    if (!existing?.onboardingComplete) {
        await seedStarterDeck(user.uid);
        await setDoc(
            userDocRef(user.uid),
            { onboardingComplete: true, updatedAt: Date.now() },
            { merge: true },
        );
    }

    return { ...profile, onboardingComplete: true };
}

function cardDocument(card: SeedCard, courseId: string, deckId: string, now: number) {
    const srs = newSrsState(now);
    return {
        deckId,
        courseId,
        front: card.front,
        meaningId: card.meaningId,
        meaningEn: card.meaningEn,
        gender: card.gender ?? null,
        wordType: card.wordType ?? "other",
        plural: card.plural ?? null,
        ipa: card.ipa ?? null,
        exampleDe: card.exampleDe ?? null,
        exampleId: card.exampleId ?? null,
        exampleEn: card.exampleEn ?? null,
        tags: card.tags ?? [],
        level: card.level ?? "A1",
        source: "seed",
        suspended: false,
        isNew: true,
        dueMs: srs.dueMs,
        srs,
        createdAt: now,
        updatedAt: now,
    };
}

async function seedStarterDeck(uid: string): Promise<void> {
    const seed = await loadSeed();
    const deckId = `${seed.courseId}-${seed.deck.slug}-${SEED_DECK_SUFFIX}`;
    const now = Date.now();

    await setDoc(
        deckDocRef(uid, deckId),
        {
            courseId: seed.courseId,
            name: seed.deck.name,
            description: seed.deck.description,
            level: seed.deck.level,
            tags: seed.deck.tags,
            cardCount: seed.cards.length,
            newPerDay: 10,
            source: "seed",
            isDefault: true,
            createdAt: now,
            updatedAt: now,
        },
        { merge: true },
    );

    for (let index = 0; index < seed.cards.length; index += 400) {
        const chunk = seed.cards.slice(index, index + 400);
        const batch = writeBatch(getDb());

        chunk.forEach((card, offset) => {
            const cardId = `seed-${seed.courseId}-${String(index + offset + 1).padStart(4, "0")}`;
            batch.set(cardDocRef(uid, cardId), cardDocument(card, seed.courseId, deckId, now), {
                merge: true,
            });
        });

        await batch.commit();
    }
}
