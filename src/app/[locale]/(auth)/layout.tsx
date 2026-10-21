"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { AuthProvider, useAuth } from "@/components/providers/auth-provider";
import { StoreProvider } from "@/components/providers/store-provider";
import { SetupNotice } from "@/components/layout/setup-notice";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AppLoading } from "@/components/layout/app-shell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const params = useParams<{ locale: string }>();
    const locale = params?.locale === "en" ? "en" : "id";

    return (
        <AuthProvider locale={locale}>
            <StoreProvider>
                <AuthFrame>{children}</AuthFrame>
            </StoreProvider>
        </AuthProvider>
    );
}

function AuthFrame({ children }: { children: React.ReactNode }) {
    const { configured, loading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (configured && !loading && user) {
            router.replace("/dashboard");
        }
    }, [configured, loading, user, router]);

    if (loading) return <AppLoading />;

    return (
        <div className="relative flex min-h-dvh flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <LocaleSwitcher />
                <ThemeToggle />
            </div>
            <div className="flex flex-1 items-start justify-center px-5 pb-16 pt-10 sm:items-center sm:pt-0">
                <div className="w-full max-w-sm">
                    {configured ? children : <SetupNotice />}
                </div>
            </div>
        </div>
    );
}
