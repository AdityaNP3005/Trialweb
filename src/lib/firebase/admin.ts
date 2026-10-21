import type { Auth } from "firebase-admin/auth";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let cachedAuth: Auth | null = null;

/**
 * Verifies Firebase ID tokens for server routes.
 * Returns null when the service account is not configured, so the endpoint can
 * respond with a helpful 503 instead of crashing.
 */
export function getAdminAuth(): Auth | null {
    if (cachedAuth) return cachedAuth;

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw.replace(/\\n/g, "\n")) as {
            project_id?: string;
            client_email?: string;
            private_key?: string;
        };

        if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
            return null;
        }

        if (getApps().length === 0) {
            initializeApp({
                credential: cert({
                    projectId: parsed.project_id,
                    clientEmail: parsed.client_email,
                    privateKey: parsed.private_key,
                }),
            });
        }

        cachedAuth = getAuth();
        return cachedAuth;
    } catch {
        return null;
    }
}
