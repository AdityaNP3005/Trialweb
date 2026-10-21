"use client";

import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    CalendarDays,
    Flame,
    Layers,
    Sparkles,
    Trophy,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { DailyStat, Deck, DeckProgress } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { computeStreak } from "@/lib/stats/streak";
import { buttonStyles } from "@/components/ui/button";
import { Progress, Skeleton } from "@/components/ui/progress";
import { DeckCard } from "@/components/decks/deck-card";
import { EmptyState } from "@/components/ui/empty-state";

type DashboardData = {
    decks: Deck[];
    progress: DeckProgress[];
    today: DailyStat;
    recent: DailyStat[];
};

export default function DashboardPage() {
    const { store, profile } = useStore();
    const t = useTranslations("dashboard");
    const locale = useLocale();

    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!store) return;
        let cancelled = false;

        (async () => {
            try {
                const [decks, progress, today, recent] = await Promise.all([
                    store.listDecks(),
                    store.listDeckProgress(),
                    store.getTodayStat(),
                    store.getRecentStats(30),
                ]);
                if (!cancelled) setData({ decks, progress, today, recent });
            } catch (cause) {
                if (!cancelled) {
                    setError(cause instanceof Error ? cause.message : "error");
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [store]);

    const name = profile?.displayName ?? "";
    const streak = data ? computeStreak(data.recent).current : 0;

    const progressById = useMemo(
        () => new Map((data?.progress ?? []).map((entry) => [entry.deckId, entry])),
        [data],
    );

    const totals = useMemo(() => {
        const list = data?.progress ?? [];
        const total = list.reduce((sum, entry) => sum + entry.total, 0);
        const known = list.reduce((sum, entry) => sum + entry.known, 0);
        return { total, known, percent: total ? Math.round((known / total) * 100) : 0 };
    }, [data]);

    const nextDeck = useMemo(() => {
        if (!data) return null;
        return (
            data.decks.find((deck) => (progressById.get(deck.id)?.percent ?? 0) < 100) ??
            data.decks[0] ??
            null
        );
    }, [data, progressById]);

    if (error) {
        return (
            <div className="surface-card p-6">
                <p className="text-sm text-danger">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">
                        {name ? t("greeting", { name }) : t("greetingFallback")}
                    </h1>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                        <CalendarDays className="size-3.5" />
                        {new Date().toLocaleDateString(locale, {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                        })}
                    </p>
                </div>
                <Link href="/decks" className={buttonStyles({ variant: "ghost", size: "sm" })}>
                    {t("openDecks")}
                    <ArrowRight className="size-3.5" />
                </Link>
            </div>

            {!data ? (
                <div className="grid gap-4 sm:grid-cols-3">
                    <Skeleton className="h-32 sm:col-span-2" />
                    <Skeleton className="h-32" />
                </div>
            ) : (
                <>
                    <section className="surface-card relative overflow-hidden p-5 sm:p-6">
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-accent/10 blur-2xl"
                        />
                        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                    {t("cycleProgress")}
                                </p>
                                <div className="mt-1 flex items-end gap-3">
                                    <span className="text-5xl font-extrabold leading-none tracking-tight">
                                        {totals.percent}%
                                    </span>
                                    <span className="mb-1 text-sm text-muted">
                                        {t("knownOf", { known: totals.known, total: totals.total })}
                                    </span>
                                </div>
                                <div className="mt-4 max-w-sm">
                                    <Progress
                                        value={totals.known}
                                        max={Math.max(1, totals.total)}
                                        label={t("cycleProgress")}
                                    />
                                    <p className="mt-1.5 text-[11px] text-muted">
                                        {t("resetHint")}
                                    </p>
                                </div>
                            </div>

                            <div className="shrink-0">
                                {nextDeck ? (
                                    <Link
                                        href={`/study/${nextDeck.id}`}
                                        className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
                                    >
                                        <Sparkles className="size-4" />
                                        {t("start")}
                                    </Link>
                                ) : (
                                    <p className="max-w-[15rem] rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
                                        {t("noDecks")}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-4 sm:grid-cols-3">
                        <StatTile
                            icon={<Trophy className="size-4" />}
                            label={t("knownToday")}
                            value={data.today.known ?? data.today.next ?? 0}
                        />
                        <StatTile
                            icon={<Layers className="size-4" />}
                            label={t("reviewsToday")}
                            value={data.today.reviews}
                        />
                        <StatTile
                            icon={<Flame className="size-4" />}
                            label={t("streak")}
                            value={t("streakDays", { count: streak })}
                        />
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
                            {t("continueDeck")}
                        </h2>

                        {data.decks.length === 0 ? (
                            <EmptyState
                                title={t("noDecks")}
                                action={
                                    <Link href="/decks" className={buttonStyles({ size: "sm" })}>
                                        {t("openDecks")}
                                    </Link>
                                }
                            />
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {data.decks.slice(0, 6).map((deck) => (
                                    <DeckCard
                                        key={deck.id}
                                        deck={deck}
                                        progress={progressById.get(deck.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

function StatTile({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="surface-card flex items-center gap-3 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                {icon}
            </span>
            <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {label}
                </p>
                <p className="text-lg font-extrabold leading-tight">{value}</p>
            </div>
        </div>
    );
}
