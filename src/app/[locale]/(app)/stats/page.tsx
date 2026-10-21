"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Flame, Layers, Target, TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { DailyStat } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { computeStreak } from "@/lib/stats/streak";
import { addDays, dateKey } from "@/lib/utils/date";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/progress";
import { Heatmap } from "@/components/stats/heatmap";

export default function StatsPage() {
    const { store } = useStore();
    const t = useTranslations("stats");
    const locale = useLocale();

    const [stats, setStats] = useState<DailyStat[] | null>(null);
    const [totals, setTotals] = useState<{ total: number; studied: number } | null>(
        null,
    );

    useEffect(() => {
        if (!store) return;
        let cancelled = false;
        (async () => {
            const [recent, counts] = await Promise.all([
                store.getRecentStats(91),
                store.getCardTotals(),
            ]);
            if (cancelled) return;
            setStats(recent);
            setTotals(counts);
        })();
        return () => {
            cancelled = true;
        };
    }, [store]);

    const aggregate = useMemo(() => {
        const result = { reviews: 0, again: 0, hard: 0, good: 0, easy: 0 };
        for (const entry of stats ?? []) {
            result.reviews += entry.reviews;
            result.again += entry.again;
            result.hard += entry.hard;
            result.good += entry.good;
            result.easy += entry.easy;
        }
        return result;
    }, [stats]);

    const weekRetention = useMemo(() => {
        if (!stats) return 0;
        const start = dateKey(addDays(new Date(), -6));
        const slice = stats.filter((entry) => entry.date >= start);
        const reviews = slice.reduce((sum, entry) => sum + entry.reviews, 0);
        const again = slice.reduce((sum, entry) => sum + entry.again, 0);
        if (reviews === 0) return 0;
        return Math.round(((reviews - again) / reviews) * 100);
    }, [stats]);

    const streak = stats ? computeStreak(stats) : { current: 0, longest: 0 };

    if (!stats || !totals) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-20" />
                <div className="grid gap-3 sm:grid-cols-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
                <Skeleton className="h-40" />
            </div>
        );
    }

    if (aggregate.reviews === 0) {
        return <EmptyState title={t("noData")} icon={<BarChart3 className="size-5" />} />;
    }

    const totalRatings = Math.max(
        1,
        aggregate.again + aggregate.hard + aggregate.good + aggregate.easy,
    );

    const breakdown = [
        { key: "again", value: aggregate.again, color: "bg-danger" },
        { key: "hard", value: aggregate.hard, color: "bg-warning" },
        { key: "good", value: aggregate.good, color: "bg-success" },
        { key: "easy", value: aggregate.easy, color: "bg-accent" },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Tile
                    icon={<TrendingUp className="size-4" />}
                    label={t("retention")}
                    value={`${weekRetention}%`}
                />
                <Tile
                    icon={<Layers className="size-4" />}
                    label={t("studiedCards")}
                    value={`${totals.studied} / ${totals.total}`}
                />
                <Tile
                    icon={<BarChart3 className="size-4" />}
                    label={t("totalReviews")}
                    value={aggregate.reviews}
                />
                <Tile
                    icon={<Flame className="size-4" />}
                    label={t("currentStreak")}
                    value={`${streak.current} · ${streak.longest}`}
                />
            </div>

            <section className="surface-card p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-bold">{t("heatmap")}</h2>
                    <div className="flex items-center gap-1 text-[10px] text-muted">
                        <span>{t("heatmapLess")}</span>
                        {[0, 1, 2, 3, 4].map((level) => (
                            <span
                                key={level}
                                className={
                                    [
                                        "size-2.5 rounded-[2px]",
                                        "bg-surface-2",
                                        "bg-accent/20",
                                        "bg-accent/40",
                                        "bg-accent/65",
                                        "bg-accent",
                                    ][level]
                                }
                            />
                        ))}
                        <span>{t("heatmapMore")}</span>
                    </div>
                </div>
                <Heatmap stats={stats} locale={locale} />
            </section>

            <section className="surface-card p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
                    <Target className="size-4 text-muted" />
                    {t("ratingBreakdown")}
                </h2>
                <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
                    {breakdown.map((entry) => (
                        <div
                            key={entry.key}
                            className={entry.color}
                            style={{ width: `${(entry.value / totalRatings) * 100}%` }}
                            title={`${entry.key}: ${entry.value}`}
                        />
                    ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    {breakdown.map((entry) => (
                        <div key={entry.key} className="flex items-center gap-1.5">
                            <span className={`size-2 rounded-full ${entry.color}`} />
                            <span className="capitalize text-muted">{entry.key}</span>
                            <span className="ml-auto font-semibold">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function Tile({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="surface-card p-4">
            <div className="mb-2 flex items-center gap-1.5 text-muted">
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-xl font-extrabold tracking-tight">{value}</p>
        </div>
    );
}
