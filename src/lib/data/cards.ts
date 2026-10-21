import {
    addDoc,
    getDocs,
    increment,
    orderBy,
    query,
    updateDoc,
    where,
    writeBatch,
    doc,
} from "firebase/firestore";
import type { Card, CardInput } from "@/types";
import { cardInputSchema } from "@/lib/validation/schemas";
import { cardDocRef, cardsColRef, deckDocRef } from "@/lib/firebase/paths";
import { getDb } from "@/lib/firebase/client";

function mapCard(id: string, data: Record<string, unknown>): Card {
    return { ...(data as Omit<Card, "id">), id };
}

export async function listCards(
    uid: string,
    deckId: string,
    max = 5000,
): Promise<Card[]> {
    const snapshot = await getDocs(
        query(
            cardsColRef(uid),
            where("deckId", "==", deckId),
            orderBy("createdAt", "asc"),
        ),
    );
    return snapshot.docs.slice(0, max).map((entry) => mapCard(entry.id, entry.data()));
}

export function buildCardDocument(input: CardInput, now: number) {
    const parsed = cardInputSchema.parse(input);
    return {
        deckId: parsed.deckId,
        courseId: parsed.courseId,
        front: parsed.front,
        meaningId: parsed.meaningId,
        meaningEn: parsed.meaningEn,
        gender: parsed.gender,
        wordType: parsed.wordType,
        plural: parsed.plural,
        ipa: parsed.ipa,
        exampleDe: parsed.exampleDe,
        exampleId: parsed.exampleId,
        exampleEn: parsed.exampleEn,
        tags: parsed.tags,
        level: parsed.level,
        source: parsed.source,
        suspended: parsed.suspended,
        createdAt: now,
        updatedAt: now,
    };
}

export async function createCard(uid: string, input: CardInput): Promise<string> {
    const now = Date.now();
    const created = await addDoc(cardsColRef(uid), buildCardDocument(input, now));

    await updateDoc(deckDocRef(uid, input.deckId), {
        cardCount: increment(1),
        updatedAt: now,
    });

    return created.id;
}

export async function updateCard(
    uid: string,
    cardId: string,
    patch: Partial<CardInput>,
) {
    const parsed = cardInputSchema.partial().parse(patch);
    await updateDoc(cardDocRef(uid, cardId), {
        ...parsed,
        updatedAt: Date.now(),
    });
}

export async function deleteCard(
    uid: string,
    card: Pick<Card, "id" | "deckId">,
) {
    const batch = writeBatch(getDb());
    batch.delete(cardDocRef(uid, card.id));
    batch.update(deckDocRef(uid, card.deckId), {
        cardCount: increment(-1),
        updatedAt: Date.now(),
    });
    await batch.commit();
}

export async function setCardSuspended(
    uid: string,
    cardId: string,
    suspended: boolean,
) {
    await updateDoc(cardDocRef(uid, cardId), {
        suspended,
        updatedAt: Date.now(),
    });
}

/** Writes cards in chunks of 400 and keeps the deck counter in sync. */
export async function bulkCreateCards(
    uid: string,
    deckId: string,
    inputs: CardInput[],
    onProgress?: (done: number, total: number) => void,
): Promise<number> {
    const total = inputs.length;
    let done = 0;

    for (let index = 0; index < total; index += 400) {
        const chunk = inputs.slice(index, index + 400);
        const batch = writeBatch(getDb());
        const now = Date.now();

        for (const input of chunk) {
            batch.set(doc(cardsColRef(uid)), buildCardDocument({ ...input, deckId }, now));
        }

        batch.update(deckDocRef(uid, deckId), {
            cardCount: increment(chunk.length),
            updatedAt: now,
        });

        await batch.commit();
        done += chunk.length;
        onProgress?.(done, total);
    }

    return done;
}
