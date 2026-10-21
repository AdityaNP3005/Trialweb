"use client";

import { useParams } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/providers/auth-provider";
import { StoreProvider, useStore } from "@/components/providers/store-provider";
import { AppLoading, AppShell } from "@/components/layout/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const params = useParams<{ locale: string }>();
    const locale = params?.locale === "en" ? "en" : "id";

    return (
        <AuthProvider locale={locale}>
            <StoreProvider>
                <Gate>{children}</Gate>
            </StoreProvider>
        </AuthProvider>
    );
}

/**
 * Free features (study, decks, stats) work without an account, so there is no
 * login redirect here: guests get the local store.
 */
function Gate({ children }: { children: React.ReactNode }) {
    const { loading } = useAuth();
    const { ready } = useStore();

    if (loading || !ready) return <AppLoading />;
    return <AppShell>{children}</AppShell>;
}
