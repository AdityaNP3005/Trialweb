"use client";

import {
    BarChart3,
    BookOpen,
    Clapperboard,
    Home,
    LogIn,
    LogOut,
    Settings,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { signOutUser } from "@/lib/firebase/auth";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/components/providers/auth-provider";
import { useStore } from "@/components/providers/store-provider";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./logo";
import { Skeleton } from "@/components/ui/progress";

const items = [
    { href: "/dashboard", key: "dashboard", icon: Home },
    { href: "/decks", key: "decks", icon: BookOpen },
    { href: "/videos", key: "videos", icon: Clapperboard },
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
        <div className="relative flex min-h-dvh flex-col">
            <header className="sticky top-0 z-30 border-b border-border bg-bg/92 backdrop-blur-sm">
                <div className="mx-auto flex w-full max-w-5xl items-center gap-5 px-4 py-3 sm:px-6">
                    <Link href="/dashboard" aria-label={tc("appName")}>
                        <Logo name={tc("appName")} showName={false} className="sm:hidden" />
                        <Logo name={tc("appName")} className="hidden sm:flex" />
                    </Link>

                    <nav className="hidden flex-1 items-center gap-5 sm:flex">
                        {items.map(({ href, key }) => {
                            const active = pathname.startsWith(href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "-mb-[13px] border-b-2 pb-[13px] pt-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors",
                                        active
                                            ? "border-accent text-fg"
                                            : "border-transparent text-muted hover:text-fg",
                                    )}
                                >
                                    {t(key)}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <LocaleSwitcher className="hidden sm:inline-flex" />
                        <ThemeToggle className="hidden sm:inline-flex" />

                        {isGuest ? (
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1.5 rounded-[0.375rem] border border-border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted transition-colors hover:border-fg/40 hover:text-fg"
                                title={t("login")}
                            >
                                <LogIn className="size-3.5" />
                                <span className="hidden sm:inline">{t("login")}</span>
                            </Link>
                        ) : (
                            <div className="flex items-center gap-1.5 border-l border-border pl-2">
                                <span
                                    title={user?.email ?? undefined}
                                    className="grid size-7 place-items-center rounded-full border border-border font-mono text-[10px] font-medium text-muted"
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
                                    className="rounded-[0.25rem] p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-danger"
                                >
                                    <LogOut className="size-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {isGuest ? (
                    <div className="border-t border-dashed border-border">
                        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6">
                            <span className="meta">
                                {t("guest")} · {t("guestModeHint")}
                            </span>
                            <Link
                                href="/signup"
                                className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-accent underline-offset-4 hover:underline"
                            >
                                {t("signup")}
                            </Link>
                        </div>
                    </div>
                ) : null}
            </header>

            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 sm:px-6 sm:pb-12">
                {children}
            </main>

            {/* Mobile: a quiet bottom strip instead of a floating pill bar. */}
            <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 backdrop-blur-sm sm:hidden">
                <div className="mx-auto grid max-w-md grid-cols-5">
                    {items.map(({ href, key, icon: Icon }) => {
                        const active = pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "flex flex-col items-center gap-1 py-2.5 text-[9px] font-medium uppercase tracking-[0.1em]",
                                    active ? "text-fg" : "text-muted",
                                )}
                            >
                                <Icon className="size-4" />
                                {t(key)}
                                <span
                                    aria-hidden
                                    className={cn(
                                        "mt-0.5 h-[2px] w-5",
                                        active ? "bg-accent" : "bg-transparent",
                                    )}
                                />
                            </Link>
                        );
                    })}
                </div>
            </nav>
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
