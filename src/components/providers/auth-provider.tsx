"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type { Profile } from "@/types";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { ensureUserBootstrap } from "@/lib/data/bootstrap";
import { fetchProfile } from "@/lib/data/profile";

type AuthContextValue = {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    error: string | null;
    configured: boolean;
    refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
    children,
    locale,
}: {
    children: React.ReactNode;
    locale: "id" | "en";
}) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(isFirebaseConfigured);
    const [error, setError] = useState<string | null>(null);
    const localeRef = useRef(locale);

    useEffect(() => {
        localeRef.current = locale;
    }, [locale]);

    useEffect(() => {
        if (!isFirebaseConfigured) return;

        let cancelled = false;
        const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
            if (cancelled) return;
            setUser(nextUser);

            if (!nextUser) {
                setProfile(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const nextProfile = await ensureUserBootstrap(
                    nextUser,
                    localeRef.current,
                );
                if (!cancelled) setProfile(nextProfile);
            } catch (cause) {
                if (!cancelled) {
                    setError(
                        cause instanceof Error ? cause.message : "Could not load profile",
                    );
                }
                try {
                    const fallback = await fetchProfile(nextUser.uid);
                    if (!cancelled) setProfile(fallback);
                } catch {
                    // Offline or rules denied; the UI will show a retryable error.
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    const refreshProfile = useCallback(async () => {
        if (!user) return;
        const next = await fetchProfile(user.uid);
        setProfile(next);
    }, [user]);

    const value = useMemo(
        () => ({
            user,
            profile,
            loading,
            error,
            configured: isFirebaseConfigured,
            refreshProfile,
        }),
        [user, profile, loading, error, refreshProfile],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used inside <AuthProvider>");
    }
    return context;
}
