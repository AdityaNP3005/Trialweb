"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChevronRight, Flame, Layers, Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { DailyStat, Deck, DeckProgress } from "@/types";
import { CEFR_LEVELS } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { computeStreak } from "@/lib/stats/streak";
import { summarizeBand } from "@/content/courses";
import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/progress";
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

    const bands = useMemo(
        () =>
            data
                ? CEFR_LEVELS.map((level) => ({
                    summary: summarizeBand(level, data.decks, progressById),
                }))
                : [],
        [data, progressById],
    );

    const recentTopics = useMemo(() => {
        if (!data) return [];
        return data.decks
            .filter((deck) => deck.source === "content")
            .map((deck) => ({ deck, progress: progressById.get(deck.id) }))
            .filter((entry) => entry.progress?.lastActivityAt)
            .sort(
                (a, b) =>
                    (b.progress?.lastActivityAt ?? 0) - (a.progress?.lastActivityAt ?? 0),
            )
            .slice(0, 3);
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

            <section className="grid gap-4 sm:grid-cols-3">
                <StatTile
                    icon={<Trophy className="size-4" />}
                    label={t("knownToday")}
                    value={data?.today.known ?? 0}
                />
                <StatTile
                    icon={<Layers className="size-4" />}
                    label={t("reviewsToday")}
                    value={data?.today.reviews ?? 0}
                />
                <StatTile
                    icon={<Flame className="size-4" />}
                    label={t("streak")}
                    value={t("streakDays", { count: streak })}
                />
            </section>

            <section className="space-y-3">
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
                        {t("pickBand")}
                    </h2>
                    <p className="mt-1 text-xs text-muted">{t("pickBandHint")}</p>
                </div>

                {!data ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {[0, 1, 2, 3, 4, 5].map((key) => (
                            <Skeleton key={key} className="h-32" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {bands.map(({ summary }) => (
                            <Link
                                key={summary.level}
                                href={`/levels/${summary.level}`}
                                className="surface-card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-accent/50"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-lg font-extrabold leading-none">
                                            {summary.level}
                                        </p>
                                        <p className="mt-1 text-xs text-muted">
                                            {t("bandTopics", { count: summary.topics })}
                                        </p>
                                    </div>
                                    <span className="text-xl font-extrabold text-accent">
                                        {summary.percent}%
                                    </span>
                                </div>

                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                                    <div
                                        className="h-full rounded-full bg-accent transition-all"
                                        style={{ width: `${summary.percent}%` }}
                                    />
                                </div>

                                <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-muted">
                                    <span>
                                        {summary.known}/{summary.total} ·{" "}
                                        {t("bandDone", {
                                            done: summary.topicsDone,
                                            total: summary.topics,
                                        })}
                                    </span>
                                    <ChevronRight className="size-4 transition group-hover:translate-x-0.5 group-hover:text-accent" />
                                </div>
                                {summary.nextTopic ? (
                                    <p className="truncate text-xs">
                                        <span className="text-muted">{t("continueWith")}: </span>
                                        <span className="font-semibold">
                                            {summary.nextTopic.icon} {summary.nextTopic.name}
                                        </span>
                                    </p>
                                ) : null}
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
                    {t("recentTopics")}
                </h2>

                {recentTopics.length === 0 ? (
                    <EmptyState
                        title={t("noRecent")}
                        body={t("noRecentBody")}
                        action={
                            <Link
                                href="/levels/A1"
                                className={buttonStyles({ size: "sm" })}
                            >
                                {t("openA1")}
                            </Link>
                        }
                    />
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {recentTopics.map(({ deck, progress }) => (
                            <DeckCard key={deck.id} deck={deck} progress={progress} />
                        ))}
                    </div>
                )}
            </section>
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
