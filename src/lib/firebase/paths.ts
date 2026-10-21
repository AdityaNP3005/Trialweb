import { collection, doc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";

export const userDocRef = (uid: string) => doc(getDb(), "users", uid);
export const decksColRef = (uid: string) =>
    collection(getDb(), "users", uid, "decks");
export const deckDocRef = (uid: string, deckId: string) =>
    doc(getDb(), "users", uid, "decks", deckId);
export const cardsColRef = (uid: string) =>
    collection(getDb(), "users", uid, "cards");
export const cardDocRef = (uid: string, cardId: string) =>
    doc(getDb(), "users", uid, "cards", cardId);
export const reviewsColRef = (uid: string) =>
    collection(getDb(), "users", uid, "reviews");
export const dailyStatsColRef = (uid: string) =>
    collection(getDb(), "users", uid, "dailyStats");
export const dailyStatDocRef = (uid: string, key: string) =>
    doc(getDb(), "users", uid, "dailyStats", key);
