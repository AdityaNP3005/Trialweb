"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { DailyStat } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { computeStreak } from "@/lib/stats/streak";
import { courseActivity, filterStatsByCourse } from "@/lib/stats/course-stats";
import { courses } from "@/content/courses";
import { cn } from "@/lib/utils/cn";
import { addDays, dateKey } from "@/lib/utils/date";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress, Skeleton } from "@/components/ui/progress";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { Heatmap, heatmapLevels } from "@/components/stats/heatmap";

export default function StatsPage() {
    const { store } = useStore();
    const t = useTranslations("stats");
    const tc = useTranslations("common");
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
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
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
        { key: t("actionNext"), value: aggregate.next, color: "bg-fg" },
        { key: t("actionRepeat"), value: aggregate.repeat, color: "bg-warning" },
    ];

    const tiles = [
        { label: t("understandRate"), value: `${understandRate}%`, hint: "7D" },
        {
            label: t("studiedCards"),
            value: `${totals.studied} / ${totals.total}`,
            hint: "TOTAL",
        },
        { label: t("totalReviews"), value: String(aggregate.reviews), hint: "91D" },
        {
            label: t("currentStreak"),
            value: String(streak.current),
            hint: `${t("bestStreak")} ${streak.longest}`,
        },
    ];

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow={tc("log")}
                title={t("title")}
                description={t("subtitle")}
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setCourse("all")}
                            aria-pressed={course === "all"}
                            className={cn(
                                "font-mono text-[11px] uppercase tracking-[0.1em] transition-colors",
                                course === "all"
                                    ? "text-fg underline decoration-accent decoration-2 underline-offset-4"
                                    : "text-muted hover:text-fg",
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
                                        entry.script === "hanzi" ? "font-cjk text-sm" : "font-mono text-[11px] uppercase tracking-[0.1em]",
                                        "transition-colors",
                                        course === entry.id
                                            ? "text-fg underline decoration-accent decoration-2 underline-offset-4"
                                            : "text-muted hover:text-fg",
                                    )}
                                >
                                    {entry.nativeName}
                                </button>
                            ))}
                    </div>
                }
            />

            <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
                {tiles.map((tile) => (
                    <div
                        key={tile.label}
                        className="border-b border-border py-4 pr-4 sm:border-b-0 sm:border-l sm:pl-4 sm:first:border-l-0 sm:first:pl-0"
                    >
                        <dt className="eyebrow">{tile.label}</dt>
                        <dd className="num mt-1.5 text-2xl font-semibold leading-none">
                            {tile.value}
                        </dd>
                        <p className="meta mt-1.5">{tile.hint}</p>
                    </div>
                ))}
            </dl>

            <section className="space-y-4">
                <SectionHeading>{t("byLanguage")}</SectionHeading>
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
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
                                <div key={entry.id} className="border-t border-border pt-3">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <p
                                            className={cn(
                                                "text-sm font-semibold",
                                                entry.script === "hanzi" && "font-cjk",
                                            )}
                                        >
                                            {entry.nativeName}
                                        </p>
                                        <span className="num text-sm font-semibold text-accent">
                                            {share}%
                                        </span>
                                    </div>
                                    <Progress value={share} className="mt-2" />
                                    <p className="meta mt-2">
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

            <section className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <SectionHeading>{t("heatmap")}</SectionHeading>
                    <div className="flex items-center gap-1.5">
                        <span className="meta">{t("heatmapLess")}</span>
                        {heatmapLevels.map((level) => (
                            <span
                                key={level}
                                className={cn("size-[11px] rounded-[2px]", level)}
                                aria-hidden
                            />
                        ))}
                        <span className="meta">{t("heatmapMore")}</span>
                    </div>
                </div>
                <Heatmap stats={visibleStats} locale={locale} />
            </section>

            <section className="space-y-3">
                <SectionHeading>{t("ratingBreakdown")}</SectionHeading>
                <div className="flex h-2 overflow-hidden bg-surface-2">
                    {breakdown.map((entry) => (
                        <div
                            key={entry.key}
                            className={entry.color}
                            style={{ width: `${(entry.value / totalRatings) * 100}%` }}
                            title={`${entry.key}: ${entry.value}`}
                        />
                    ))}
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                    {breakdown.map((entry) => (
                        <div key={entry.key} className="flex items-center gap-2">
                            <span className={cn("size-2 rounded-full", entry.color)} />
                            <span className="text-xs text-muted">{entry.key}</span>
                            <span className="num text-xs font-semibold">{entry.value}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
