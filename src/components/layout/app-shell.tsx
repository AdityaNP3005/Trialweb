"use client";

import {
    BarChart3,
    BookOpen,
    Home,
    LogIn,
    LogOut,
    Settings,
    Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { signOutUser } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/components/providers/auth-provider";
import { useStore } from "@/components/providers/store-provider";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { Skeleton } from "@/components/ui/progress";

const items = [
    { href: "/dashboard", key: "dashboard", icon: Home },
    { href: "/decks", key: "decks", icon: BookOpen },
    { href: "/stats", key: "stats", icon: BarChart3 },
    { href: "/settings", key: "settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
    const t = useTranslations("nav");
    const tc = useTranslations("common");
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const { profile } = useStore();

    const isGuest = !user;
    const displayName =
        user?.displayName ?? profile?.displayName ?? user?.email?.split("@")[0] ?? "";
    const initials = isGuest ? "?" : displayName.slice(0, 2).toUpperCase() || "?";

    return (
        <div className="flex min-h-dvh flex-col">
            <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
                <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 font-bold tracking-tight"
                    >
                        <span className="grid size-8 place-items-center rounded-xl bg-accent text-accent-fg">
                            <Sparkles className="size-4" />
                        </span>
                        <span className="hidden sm:inline">{tc("appName")}</span>
                    </Link>

                    <nav className="ml-2 flex flex-1 items-center gap-1">
                        {items.map(({ href, key, icon: Icon }) => {
                            const active = pathname.startsWith(href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition",
                                        active
                                            ? "bg-accent-soft text-accent"
                                            : "text-muted hover:bg-surface-2 hover:text-fg",
                                    )}
                                >
                                    <Icon className="size-4" />
                                    <span className="hidden sm:inline">{t(key)}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <LocaleSwitcher className="hidden sm:inline-flex" />
                    <ThemeToggle className="hidden sm:inline-flex" />

                    {isGuest ? (
                        <Link
                            href="/login"
                            className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-muted transition hover:border-accent/40 hover:text-fg"
                            title={t("login")}
                        >
                            <LogIn className="size-3.5" />
                            <span className="hidden sm:inline">{t("login")}</span>
                        </Link>
                    ) : (
                        <div className="flex items-center gap-1.5 border-l border-border pl-2">
                            <span
                                title={user?.email ?? undefined}
                                className="grid size-8 place-items-center rounded-full bg-surface-2 text-[11px] font-bold text-muted"
                            >
                                {initials}
                            </span>
                            <button
                                type="button"
                                onClick={async () => {
                                    await signOutUser();
                                    router.replace("/");
                                }}
                                title={t("logout")}
                                aria-label={t("logout")}
                                className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-danger"
                            >
                                <LogOut className="size-4" />
                            </button>
                        </div>
                    )}
                </div>

                {isGuest ? (
                    <div className="border-t border-border bg-accent-soft/60">
                        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-1.5 text-[11px] font-medium text-accent">
                            <span>{t("guest")} · {t("guestModeHint")}</span>
                            <Link href="/signup" className="font-bold underline-offset-2 hover:underline">
                                {t("signup")}
                            </Link>
                        </div>
                    </div>
                ) : null}
            </header>

            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        </div>
    );
}

export function AppLoading() {
    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
            <Skeleton className="h-8 w-48" />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
        </div>
    );
}
