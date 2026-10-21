import {
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
    type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

/** Maps Firebase auth error codes to translation keys in `errors.*`. */
export function authErrorKey(error: unknown): string {
    const code =
        typeof error === "object" && error !== null && "code" in error
            ? String((error as { code: unknown }).code)
            : "";

    switch (code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
        case "auth/invalid-email":
            return "authInvalid";
        case "auth/email-already-in-use":
            return "authEmailInUse";
        case "auth/weak-password":
            return "weakPassword";
        case "auth/popup-blocked":
        case "auth/popup-closed-by-user":
        case "auth/cancelled-popup-request":
        case "auth/operation-not-supported-in-this-environment":
            return "authPopup";
        case "auth/network-request-failed":
            return "network";
        default:
            return "unknown";
    }
}

export async function signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(getFirebaseAuth(), provider);
    return credential.user;
}

export async function signInWithEmail(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password,
    );
    return credential.user;
}

export async function signUpWithEmail(
    email: string,
    password: string,
    displayName?: string,
) {
    const credential = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password,
    );
    if (displayName) {
        await updateProfile(credential.user, { displayName });
    }
    return credential.user;
}

export async function sendResetEmail(email: string) {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function signOutUser() {
    await signOut(getFirebaseAuth());
}
