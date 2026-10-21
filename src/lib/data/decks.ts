import {
    addDoc,
    deleteDoc,
    getDoc,
    getDocs,
    orderBy,
    query,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";
import type { Deck, DeckInput } from "@/types";
import { deckInputSchema } from "@/lib/validation/schemas";
import {
    cardsColRef,
    deckCycleDocRef,
    deckDocRef,
    decksColRef,
    progressColRef,
} from "@/lib/firebase/paths";
import { getDb } from "@/lib/firebase/client";

/** User decks only; bundled content decks are merged in the store layer. */
export async function listDecks(uid: string): Promise<Deck[]> {
    const snapshot = await getDocs(
        query(decksColRef(uid), orderBy("createdAt", "asc")),
    );
    return snapshot.docs
        .map((entry) => ({
            ...(entry.data() as Omit<Deck, "id">),
            id: entry.id,
            source: (entry.data().source === "user" ? "user" : "content") as Deck["source"],
            readOnly: false,
        }))
        .filter((deck) => deck.source === "user");
}

export async function fetchDeck(uid: string, deckId: string): Promise<Deck | null> {
    const snapshot = await getDoc(deckDocRef(uid, deckId));
    if (!snapshot.exists()) return null;
    return {
        ...(snapshot.data() as Omit<Deck, "id">),
        id: snapshot.id,
        source: "user",
        readOnly: false,
    };
}

export async function createDeck(
    uid: string,
    courseId: string,
    raw: DeckInput,
): Promise<string> {
    const input = deckInputSchema.parse(raw);
    const now = Date.now();
    const created = await addDoc(decksColRef(uid), {
        courseId,
        name: input.name,
        description: input.description,
        level: input.level,
        tags: input.tags,
        cardCount: 0,
        source: "user",
        isDefault: false,
        readOnly: false,
        createdAt: now,
        updatedAt: now,
    });
    return created.id;
}

export async function updateDeck(
    uid: string,
    deckId: string,
    patch: Partial<DeckInput>,
) {
    const input = deckInputSchema.partial().parse(patch);
    await updateDoc(deckDocRef(uid, deckId), { ...input, updatedAt: Date.now() });
}

export async function deleteDeck(uid: string, deckId: string) {
    const [cards, progress] = await Promise.all([
        getDocs(query(cardsColRef(uid), where("deckId", "==", deckId))),
        getDocs(query(progressColRef(uid), where("deckId", "==", deckId))),
    ]);

    const refs = [...cards.docs.map((entry) => entry.ref), ...progress.docs.map((entry) => entry.ref)];
    for (let index = 0; index < refs.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const ref of refs.slice(index, index + 400)) {
            batch.delete(ref);
        }
        await batch.commit();
    }

    await deleteDoc(deckCycleDocRef(uid, deckId));
    await deleteDoc(deckDocRef(uid, deckId));
}
