"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronRight, Clapperboard } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { DailyStat, Deck, DeckProgress, PlaylistProgress } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { computeStreak } from "@/lib/stats/streak";
import { getCourse, courseSections, summarizeSection } from "@/content/courses";
import { CourseSwitcher } from "@/components/courses/course-switcher";
import { sectionLabelFor, unitLabelFor } from "@/lib/content/labels";
import { videoPlaylist, videoSections } from "@/lib/content/videos";
import { emptyPlaylistProgress, playlistSummary } from "@/lib/video/progress";
import { buttonStyles } from "@/components/ui/button";
import { Progress, Skeleton } from "@/components/ui/progress";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { ManifestRow } from "@/components/ui/manifest-row";
import { EmptyState } from "@/components/ui/empty-state";

type DashboardData = {
    decks: Deck[];
    progress: DeckProgress[];
    today: DailyStat;
    recent: DailyStat[];
    video: PlaylistProgress | null;
};

export default function DashboardPage() {
    const { store, profile, refreshProfile } = useStore();
    const t = useTranslations("dashboard");
    const td = useTranslations("decks");
    const tc = useTranslations("common");
    const tv = useTranslations("video");
    const locale = useLocale();

    const activeCourseId = profile?.activeCourseId ?? "de";
    const course = getCourse(activeCourseId);
    const sections = useMemo(() => courseSections(activeCourseId), [activeCourseId]);

    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [switching, setSwitching] = useState(false);

    const videoSection = videoSections(activeCourseId)[0];
    const video = videoSection ? videoPlaylist(activeCourseId, videoSection) : null;

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
                const videoProgress = video
                    ? await store.getVideoProgress(video.id).catch(() => null)
                    : null;
                if (!cancelled)
                    setData({ decks, progress, today, recent, video: videoProgress });
            } catch (cause) {
                if (!cancelled) {
                    setError(cause instanceof Error ? cause.message : "error");
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [store, activeCourseId, video]);

    const name = profile?.displayName ?? "";
    const streak = data ? computeStreak(data.recent).current : 0;

    const progressById = useMemo(
        () => new Map((data?.progress ?? []).map((entry) => [entry.deckId, entry])),
        [data],
    );

    const bands = useMemo(
        () =>
            data
                ? sections.map((section) => ({
                    section,
                    summary: summarizeSection(section.id, data.decks, progressById),
                }))
                : [],
        [data, progressById, sections],
    );

    async function switchCourse(courseId: string) {
        if (!store || courseId === activeCourseId) return;
        setSwitching(true);
        setData(null);
        try {
            await store.updateProfile({ activeCourseId: courseId });
            await refreshProfile();
        } finally {
            setSwitching(false);
        }
    }

    const videoSummary = useMemo(
        () =>
            video
                ? playlistSummary(
                    data?.video ?? emptyPlaylistProgress(video),
                    video,
                )
                : null,
        [data, video],
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
            .slice(0, 4);
    }, [data, progressById]);

    if (error) {
        return (
            <div className="panel p-6">
                <p className="text-sm text-danger">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow={new Date().toLocaleDateString(locale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                })}
                title={name ? t("greeting", { name }) : t("greetingFallback")}
                meta={[
                    { label: t("knownToday"), value: String(data?.today.known ?? 0) },
                    { label: t("reviewsToday"), value: String(data?.today.reviews ?? 0) },
                    { label: t("streak"), value: t("streakDays", { count: streak }) },
                ]}
                actions={
                    <Link href="/decks" className={buttonStyles({ variant: "secondary", size: "sm" })}>
                        {t("openDecks")}
                        <ArrowRight className="size-3.5" />
                    </Link>
                }
            />

            <section className="space-y-4">
                <CourseSwitcher
                    activeCourseId={activeCourseId}
                    disabled={switching}
                    onSelect={switchCourse}
                />

                <SectionHeading
                    hint={course.unitNoun === "book" ? t("pickBookHint") : t("pickBandHint")}
                >
                    {course.unitNoun === "book" ? t("pickBook") : t("pickBand")}
                </SectionHeading>

                {!data ? (
                    <div className="space-y-2">
                        {[0, 1, 2, 3].map((key) => (
                            <Skeleton key={key} className="h-16" />
                        ))}
                    </div>
                ) : (
                    <ul className="border-t border-border">
                        {bands.map(({ section, summary }) => (
                            <li key={section.id}>
                                <Link
                                    href={`/levels/${section.id}`}
                                    className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-border py-4 transition-colors hover:bg-surface-2/40 sm:grid-cols-[5rem_1fr_12rem_auto]"
                                >
                                    <span className="display whitespace-nowrap text-lg leading-none text-fg">
                                        {sectionLabelFor(section.id, course.unitNoun, tc)}
                                    </span>

                                    <div className="min-w-0">
                                        <p className="text-[13.5px] font-semibold leading-tight">
                                            {course.unitNoun === "book"
                                                ? t("bookDone", {
                                                    done: summary.topicsDone,
                                                    total: summary.topics,
                                                })
                                                : t("bandDone", {
                                                    done: summary.topicsDone,
                                                    total: summary.topics,
                                                })}
                                        </p>
                                        <p className="meta mt-1 truncate">
                                            {course.unitNoun === "book"
                                                ? t("bookChapters", { count: summary.topics })
                                                : t("bandTopics", { count: summary.topics })}
                                            {summary.nextTopic
                                                ? ` · ${t("continueWith")}: ${unitLabelFor(
                                                    summary.nextTopic.topicOrder,
                                                    summary.nextTopic.name,
                                                    course.unitNoun,
                                                    tc,
                                                    locale,
                                                )}`
                                                : ""}
                                        </p>
                                    </div>

                                    <div className="col-span-3 sm:col-span-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="meta">
                                                {summary.known}/{summary.total}
                                            </span>
                                            <span className="num text-sm font-semibold">
                                                {summary.percent}%
                                            </span>
                                        </div>
                                        <Progress
                                            value={summary.percent}
                                            className="mt-2 h-[2px]"
                                        />
                                    </div>

                                    <ChevronRight className="hidden size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-fg sm:block" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                {video ? (
                    <Link
                        href={`/videos/${video.sectionId}`}
                        className="group flex items-center gap-4 border-y border-border py-3 transition-colors hover:bg-surface-2/40"
                    >
                        <span className="grid size-9 shrink-0 place-items-center rounded-[0.25rem] border border-border text-accent">
                            <Clapperboard className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13.5px] font-semibold leading-tight">
                                {tv("title")} ·{" "}
                                {sectionLabelFor(
                                    video.sectionId,
                                    course.unitNoun,
                                    tc,
                                )}
                            </p>
                            <p className="meta mt-1">
                                {videoSummary?.done ?? 0}/{videoSummary?.total ?? 0} ·{" "}
                                {video.channel}
                            </p>
                            <Progress
                                value={videoSummary?.percent ?? 0}
                                className="mt-2 h-[2px] max-w-md"
                            />
                        </div>
                        <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
                    </Link>
                ) : null}
            </section>

            <section className="space-y-4">
                <SectionHeading
                    action={
                        recentTopics.length > 0 ? (
                            <Link
                                href="/decks"
                                className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-fg"
                            >
                                {t("openDecks")}
                            </Link>
                        ) : undefined
                    }
                >
                    {t("recentTopics")}
                </SectionHeading>

                {recentTopics.length === 0 ? (
                    <EmptyState
                        title={t("noRecent")}
                        body={
                            course.unitNoun === "book"
                                ? t("noRecentBodyBook")
                                : t("noRecentBody")
                        }
                        action={
                            course.unitNoun === "book" && sections[0] ? (
                                <Link
                                    href={`/levels/${sections[0].id}`}
                                    className={buttonStyles({ size: "sm" })}
                                >
                                    {t("openBook", {
                                        book: sectionLabelFor(
                                            sections[0].id,
                                            course.unitNoun,
                                            tc,
                                        ),
                                    })}
                                </Link>
                            ) : (
                                <Link href="/levels/A1" className={buttonStyles({ size: "sm" })}>
                                    {t("openA1")}
                                </Link>
                            )
                        }
                    />
                ) : (
                    <ul className="border-t border-border">
                        {recentTopics.map(({ deck, progress }, index) => (
                            <ManifestRow
                                key={deck.id}
                                href={`/study/${deck.id}`}
                                index={index + 1}
                                title={unitLabelFor(
                                    deck.topicOrder,
                                    deck.name,
                                    course.unitNoun,
                                    tc,
                                    locale,
                                )}
                                meta={[
                                    sectionLabelFor(deck.level, course.unitNoun, tc),
                                    progress?.cycle
                                        ? td("cycleLabel", { cycle: progress.cycle })
                                        : "",
                                ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                percent={progress?.percent ?? 0}
                            />
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
