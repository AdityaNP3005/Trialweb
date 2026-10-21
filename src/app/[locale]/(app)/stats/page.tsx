"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Flame, Layers, Target, TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { DailyStat } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { computeStreak } from "@/lib/stats/streak";
import { courseActivity, filterStatsByCourse } from "@/lib/stats/course-stats";
import { courses } from "@/content/courses";
import { cn } from "@/lib/utils/cn";
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
    const [course, setCourse] = useState<"all" | string>("all");

    useEffect(() => {
        if (!store) return;
        let cancelled = false;
        (async () => {
            const [recent, counts] = await Promise.all([
                store.getRecentStats(91),
                store.getCardTotals(course === "all" ? undefined : course),
            ]);
            if (cancelled) return;
            setStats(recent);
            setTotals(counts);
        })();
        return () => {
            cancelled = true;
        };
    }, [store, course]);

    const visibleStats = useMemo(
        () => filterStatsByCourse(stats ?? [], course),
        [stats, course],
    );

    const perCourse = useMemo(() => courseActivity(stats ?? []), [stats]);

    const aggregate = useMemo(() => {
        const result = { reviews: 0, next: 0, repeat: 0, known: 0 };
        for (const entry of visibleStats) {
            result.reviews += entry.reviews;
            result.next += entry.next ?? 0;
            result.repeat += entry.repeat ?? 0;
            result.known += entry.known ?? 0;
        }
        return result;
    }, [visibleStats]);

    const allTimeReviews = useMemo(
        () => (stats ?? []).reduce((sum, entry) => sum + entry.reviews, 0),
        [stats],
    );

    const understandRate = useMemo(() => {
        if (!stats) return 0;
        const start = dateKey(addDays(new Date(), -6));
        const slice = visibleStats.filter((entry) => entry.date >= start);
        const reviews = slice.reduce((sum, entry) => sum + entry.reviews, 0);
        const next = slice.reduce((sum, entry) => sum + (entry.next ?? 0), 0);
        if (reviews === 0) return 0;
        return Math.round((next / reviews) * 100);
    }, [visibleStats, stats]);

    const streak = stats ? computeStreak(visibleStats) : { current: 0, longest: 0 };

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

    if (allTimeReviews === 0) {
        return <EmptyState title={t("noData")} icon={<BarChart3 className="size-5" />} />;
    }

    const totalRatings = Math.max(1, aggregate.next + aggregate.repeat);

    const breakdown = [
        { key: t("actionNext"), value: aggregate.next, color: "bg-success" },
        { key: t("actionRepeat"), value: aggregate.repeat, color: "bg-warning" },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
            </div>

            <section className="surface-card p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-bold">{t("byLanguage")}</h2>
                    <div className="flex flex-wrap gap-1">
                        <button
                            type="button"
                            onClick={() => setCourse("all")}
                            aria-pressed={course === "all"}
                            className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                                course === "all"
                                    ? "bg-accent text-accent-fg"
                                    : "bg-surface-2 text-muted hover:text-fg",
                            )}
                        >
                            {t("allLanguages")}
                        </button>
                        {courses
                            .filter((entry) => entry.enabled)
                            .map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => setCourse(entry.id)}
                                    aria-pressed={course === entry.id}
                                    className={cn(
                                        "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                                        course === entry.id
                                            ? "bg-accent text-accent-fg"
                                            : "bg-surface-2 text-muted hover:text-fg",
                                    )}
                                >
                                    <span aria-hidden>{entry.flag}</span> {entry.nativeName}
                                </button>
                            ))}
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    {courses
                        .filter((entry) => entry.enabled)
                        .map((entry) => {
                            const data = perCourse.find(
                                (item) => item.courseId === entry.id,
                            );
                            const reviews = data?.reviews ?? 0;
                            const share =
                                allTimeReviews > 0
                                    ? Math.round((reviews / allTimeReviews) * 100)
                                    : 0;
                            return (
                                <div
                                    key={entry.id}
                                    className="rounded-xl border border-border bg-surface-2/50 p-3"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-bold">
                                            <span aria-hidden>{entry.flag}</span>{" "}
                                            {entry.nativeName}
                                        </p>
                                        <span className="text-[11px] font-semibold text-accent">
                                            {share}%
                                        </span>
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                                        <div
                                            className="h-full rounded-full bg-accent"
                                            style={{ width: `${share}%` }}
                                        />
                                    </div>
                                    <p className="mt-2 text-[11px] text-muted">
                                        {t("languageStats", {
                                            reviews,
                                            known: data?.known ?? 0,
                                            minutes: Math.round((data?.studyMs ?? 0) / 60000),
                                        })}
                                    </p>
                                </div>
                            );
                        })}
                </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Tile
                    icon={<TrendingUp className="size-4" />}
                    label={t("understandRate")}
                    value={`${understandRate}%`}
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
                <Heatmap stats={visibleStats} locale={locale} />
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
