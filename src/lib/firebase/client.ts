import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
    connectFirestoreEmulator,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
    firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

export const useEmulators =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "1" ||
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

function ensureApp(): FirebaseApp {
    if (!isFirebaseConfigured) {
        throw new Error(
            "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* variables to .env.local.",
        );
    }
    if (!app) {
        app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    }
    return app;
}

export function getFirebaseAuth(): Auth {
    if (!auth) {
        auth = getAuth(ensureApp());

        if (useEmulators && !authEmulatorConnected) {
            authEmulatorConnected = true;
            connectAuthEmulator(auth, "http://127.0.0.1:9099", {
                disableWarnings: true,
            });
        }
    }
    return auth;
}

export function getDb(): Firestore {
    if (!db) {
        if (typeof window === "undefined") {
            throw new Error("Firestore can only be initialized in the browser.");
        }

        db = initializeFirestore(ensureApp(), {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager(),
            }),
        });

        if (useEmulators && !firestoreEmulatorConnected) {
            firestoreEmulatorConnected = true;
            connectFirestoreEmulator(db, "127.0.0.1", 8080);
        }
    }
    return db;
}
