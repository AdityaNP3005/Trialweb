import type { User } from "firebase/auth";
import { setDoc } from "firebase/firestore";
import type { Profile } from "@/types";
import { userDocRef } from "@/lib/firebase/paths";
import { defaultProfile, fetchProfile } from "./profile";
import { normalizeBands } from "@/lib/study/progress";

/**
 * Creates the profile on first sign-in.
 *
 * Bundled decks are *not* copied into the account anymore: cards live in the
 * app bundle and only progress documents are written, so an account costs a
 * few dozen reads instead of thousands of writes.
 */
export async function ensureUserBootstrap(
    user: User,
    uiLocale: "id" | "en",
): Promise<Profile> {
    const existing = await fetchProfile(user.uid);

    if (existing) {
        const normalized: Profile = {
            ...existing,
            bands: normalizeBands(existing.bands),
        };
        if (!existing.bands || existing.engineV2 !== true) {
            await setDoc(
                userDocRef(user.uid),
                {
                    bands: normalized.bands,
                    updatedAt: Date.now(),
                },
                { merge: true },
            );
        }
        return normalized;
    }

    const profile = defaultProfile({
        displayName: user.displayName,
        email: user.email,
        uiLocale,
    });

    await setDoc(userDocRef(user.uid), profile, { merge: true });
    return profile;
}
