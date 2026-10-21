import { getDoc, setDoc, updateDoc } from "firebase/firestore";
import type { Profile } from "@/types";
import { userDocRef } from "@/lib/firebase/paths";

export async function fetchProfile(uid: string): Promise<Profile | null> {
    const snapshot = await getDoc(userDocRef(uid));
    if (!snapshot.exists()) return null;
    return { ...(snapshot.data() as Profile), };
}

export function defaultProfile(input: {
    displayName: string | null;
    email: string | null;
    uiLocale: "id" | "en";
}): Profile {
    const now = Date.now();
    return {
        displayName: input.displayName,
        email: input.email,
        uiLocale: input.uiLocale,
        activeCourseId: "de",
        dailyGoal: 20,
        newPerDay: 10,
        ttsVoiceURI: null,
        ttsRate: 1,
        onboardingComplete: false,
        createdAt: now,
        updatedAt: now,
    };
}

export async function saveProfile(uid: string, profile: Profile) {
    await setDoc(userDocRef(uid), profile, { merge: true });
}

export async function patchProfile(
    uid: string,
    patch: Partial<Omit<Profile, "createdAt">>,
) {
    await updateDoc(userDocRef(uid), { ...patch, updatedAt: Date.now() });
}
