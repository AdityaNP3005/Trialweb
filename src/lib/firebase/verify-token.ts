import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Firebase publishes the public keys used to sign ID tokens. Verifying against
 * this JWKS avoids shipping firebase-admin (and a service account) to the
 * serverless function.
 */
const JWKS = createRemoteJWKSet(
    new URL(
        "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
    ),
);

export type TokenIdentity = { uid: string };

export async function verifyFirebaseIdToken(
    token: string,
): Promise<TokenIdentity | null> {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return null;

    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: `https://securetoken.google.com/${projectId}`,
            audience: projectId,
        });

        if (!payload.sub) return null;
        return { uid: payload.sub };
    } catch {
        return null;
    }
}
