import { arrayUnion, getDoc, setDoc } from "firebase/firestore";
import { writingDocRef } from "@/lib/firebase/paths";

/**
 * `users/{uid}/writing/{courseId}` holds `chars`, every Hanzi the learner has
 * written to the end. `arrayUnion` keeps concurrent tabs and repeated guest
 * migrations from duplicating or dropping entries.
 */
export async function fetchWrittenCharacters(uid: string, courseId: string): Promise<string[]> {
    const snapshot = await getDoc(writingDocRef(uid, courseId));
    return snapshot.exists() ? ((snapshot.data().chars as string[] | undefined) ?? []) : [];
}

export async function saveWrittenCharacters(
    uid: string,
    courseId: string,
    chars: string[],
): Promise<void> {
    if (chars.length === 0) return;
    await setDoc(
        writingDocRef(uid, courseId),
        { chars: arrayUnion(...chars), updatedAt: Date.now() },
        { merge: true },
    );
}
