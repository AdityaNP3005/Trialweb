"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useLocale } from "next-intl";
import type { Profile } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { listDecks } from "@/lib/data/decks";
import { fetchProfile } from "@/lib/data/profile";
import { migrateLegacyEngine } from "@/lib/data/migrate-legacy";
import { migrateTopicProgress } from "@/lib/data/migrate-topics";
import { CloudStore } from "@/lib/store/cloud-store";
import { GuestStore } from "@/lib/store/local-store";
import { migrateGuestData } from "@/lib/store/migrate";
import type { StudyStore } from "@/lib/store/types";

type StoreContextValue = {
    store: StudyStore | null;
    profile: Profile | null;
    ready: boolean;
    refreshProfile: () => Promise<void>;
};

const StoreContext = createContext<StoreContextValue | null>(null);

/**
 * Picks the data backend:
 * - signed in  -> Firestore (cloud store)
 * - no account -> localStorage (guest store), no API needed at all
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const localeParam = useLocale();
    const uiLocale = localeParam === "en" ? "en" : "id";

    const [store, setStore] = useState<StudyStore | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (loading) return;
        let cancelled = false;

        (async () => {
            setReady(false);
            try {
                if (user) {
                    const decks = await listDecks(user.uid).catch(() => []);
                    await migrateGuestData(user.uid, decks.length).catch(() => false);
                    const storedProfile = await fetchProfile(user.uid).catch(() => null);
                    await migrateLegacyEngine(user.uid, storedProfile).catch(() => false);
                    const afterEngine = await fetchProfile(user.uid).catch(() => null);
                    await migrateTopicProgress(user.uid, afterEngine).catch(() => false);
                }
            } catch {
                // Migration is best-effort.
            }

            const next: StudyStore = user
                ? new CloudStore(user.uid, uiLocale)
                : new GuestStore(uiLocale);

            let nextProfile: Profile | null = null;
            try {
                nextProfile = await next.getProfile();
            } catch {
                nextProfile = null;
            }

            if (cancelled) return;
            setStore(next);
            setProfile(nextProfile);
            setReady(true);
        })();

        return () => {
            cancelled = true;
        };
    }, [user, loading, uiLocale]);

    const refreshProfile = useCallback(async () => {
        if (!store) return;
        const next = await store.getProfile();
        setProfile(next);
    }, [store]);

    const value = useMemo(
        () => ({ store, profile, ready, refreshProfile }),
        [store, profile, ready, refreshProfile],
    );

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error("useStore must be used inside <StoreProvider>");
    }
    return context;
}
