import {
    addDoc,
    deleteDoc,
    getCountFromServer,
    getDoc,
    getDocs,
    orderBy,
    query,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";
import type { Deck, DeckCounts, DeckInput } from "@/types";
import { deckInputSchema } from "@/lib/validation/schemas";
import {
    cardsColRef,
    deckDocRef,
    decksColRef,
} from "@/lib/firebase/paths";
import { getDb } from "@/lib/firebase/client";

export async function listDecks(uid: string): Promise<Deck[]> {
    const snapshot = await getDocs(
        query(decksColRef(uid), orderBy("createdAt", "asc")),
    );
    return snapshot.docs.map((entry) => ({
        ...(entry.data() as Omit<Deck, "id">),
        id: entry.id,
    }));
}

export async function fetchDeck(uid: string, deckId: string): Promise<Deck | null> {
    const snapshot = await getDoc(deckDocRef(uid, deckId));
    if (!snapshot.exists()) return null;
    return { ...(snapshot.data() as Omit<Deck, "id">), id: snapshot.id };
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
        newPerDay: input.newPerDay,
        source: "user",
        isDefault: false,
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
    const cards = await getDocs(
        query(cardsColRef(uid), where("deckId", "==", deckId), orderBy("createdAt")),
    );

    const refs = cards.docs.map((entry) => entry.ref);
    for (let index = 0; index < refs.length; index += 400) {
        const batch = writeBatch(getDb());
        for (const ref of refs.slice(index, index + 400)) {
            batch.delete(ref);
        }
        await batch.commit();
    }

    await deleteDoc(deckDocRef(uid, deckId));
}

export async function fetchDeckCounts(
    uid: string,
    deckId: string,
): Promise<DeckCounts> {
    const now = Date.now();
    const [total, due, fresh] = await Promise.all([
        getCountFromServer(query(cardsColRef(uid), where("deckId", "==", deckId))),
        getCountFromServer(
            query(
                cardsColRef(uid),
                where("deckId", "==", deckId),
                where("isNew", "==", false),
                where("dueMs", "<=", now),
            ),
        ),
        getCountFromServer(
            query(
                cardsColRef(uid),
                where("deckId", "==", deckId),
                where("isNew", "==", true),
            ),
        ),
    ]);

    return {
        total: total.data().count,
        due: due.data().count,
        new: fresh.data().count,
    };
}

export async function fetchGlobalCounts(
    uid: string,
): Promise<Omit<DeckCounts, "total">> {
    const now = Date.now();

    const [due, fresh] = await Promise.all([
        getCountFromServer(
            query(
                cardsColRef(uid),
                where("isNew", "==", false),
                where("dueMs", "<=", now),
            ),
        ),
        getCountFromServer(
            query(cardsColRef(uid), where("isNew", "==", true)),
        ),
    ]);

    return { due: due.data().count, new: fresh.data().count };
}

export async function fetchCardTotals(
    uid: string,
): Promise<{ total: number; studied: number }> {
    const [total, studied] = await Promise.all([
        getCountFromServer(query(cardsColRef(uid))),
        getCountFromServer(
            query(cardsColRef(uid), where("isNew", "==", false)),
        ),
    ]);

    return { total: total.data().count, studied: studied.data().count };
}
