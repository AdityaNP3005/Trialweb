"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Play, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Deck, DeckProgress } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { getCourseForSection, summarizeSection } from "@/content/courses"; import { getSection } from "@/lib/content/registry";
import { sectionLabelFor, unitLabelFor } from "@/lib/content/labels";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Progress, Skeleton } from "@/components/ui/progress";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { ManifestRow } from "@/components/ui/manifest-row";

export default function LevelPage() {
    const params = useParams<{ level: string }>();
    const sectionId = params?.level ?? "";
    const router = useRouter();
    const { store, profile, refreshProfile } = useStore();
    const t = useTranslations("levels");
    const tc = useTranslations("common");
    const locale = useLocale();

    const [decks, setDecks] = useState<Deck[] | null>(null);
    const [progress, setProgress] = useState<Map<string, DeckProgress>>(new Map());

    const section = getSection(sectionId);
    const course = getCourseForSection(sectionId);
    const valid = Boolean(section && course);

    // Deep links may point at the other course (e.g. /levels/book2 while German
    // is active). Switch the course first, otherwise the unit list is empty.
    const activeCourseId = profile?.activeCourseId;
    useEffect(() => {
        if (!store || !course || !activeCourseId) return;
        if (activeCourseId === course.id) return;
        void store
            .updateProfile({ activeCourseId: course.id })
            .then(() => refreshProfile());
    }, [store, course, activeCourseId, refreshProfile]);

    useEffect(() => {
        if (!valid) {
            router.replace("/dashboard");
        }
    }, [valid, router]);

    useEffect(() => {
        if (!store || !valid) return;
        let cancelled = false;
        setDecks(null);
        (async () => {
            const [nextDecks, nextProgress] = await Promise.all([
                store.listDecks(),
                store.listDeckProgress(),
            ]);
            if (cancelled) return;
            setDecks(nextDecks);
            setProgress(new Map(nextProgress.map((entry) => [entry.deckId, entry])));
        })();
        return () => {
            cancelled = true;
        };
    }, [store, valid, sectionId, activeCourseId]);

    const topics = useMemo(
        () =>
            (decks ?? [])
                .filter((deck) => deck.source === "content" && deck.level === sectionId)
                .sort((a, b) => (a.topicOrder ?? 0) - (b.topicOrder ?? 0)),
        [decks, sectionId],
    );

    const summary = useMemo(
        () => summarizeSection(sectionId, decks ?? [], progress),
        [sectionId, decks, progress],
    );

    async function resetTopic(deckId: string) {
        if (!store) return;
        if (!window.confirm(t("resetBody"))) return;
        await store.resetDeckCycle(deckId);
        const next = await store.listDeckProgress();
        setProgress(new Map(next.map((item) => [item.deckId, item])));
    }

    if (!valid) return null;

    if (!decks) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-10" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    return (
        <div className="space-y-7">
            <PageHeader
                back={{ href: "/dashboard", label: t("back") }}
                eyebrow={`${course!.nativeName} · ${course!.unitNoun === "book" ? tc("unitBook") : tc("unitBand")}`}
                title={
                    <span className="flex flex-wrap items-center gap-3">
                        {sectionLabelFor(section!.id, course!.unitNoun, tc)}
                        {course!.unitNoun === "book" ? (
                            <span className="text-lg font-normal text-muted">
                                {section!.title}
                            </span>
                        ) : null}
                    </span>
                }
                description={
                    course!.unitNoun === "book"
                        ? t("summaryBook", {
                            chapters: summary.topics,
                            done: summary.topicsDone,
                            known: summary.known,
                            total: summary.total,
                        })
                        : t("summary", {
                            topics: summary.topics,
                            done: summary.topicsDone,
                            known: summary.known,
                            total: summary.total,
                        })
                }
                meta={[
                    {
                        label:
                            course!.unitNoun === "book"
                                ? tc("chapterShort")
                                : tc("topicShort"),
                        value: String(summary.topics),
                    },
                    {
                        label: tc("knownShort"),
                        value: `${summary.known}/${summary.total}`,
                    },
                    { label: tc("progressShort"), value: `${summary.percent}%` },
                ]}
                actions={
                    summary.nextTopic ? (
                        <Link
                            href={`/study/${summary.nextTopic.id}`}
                            className={buttonStyles({ size: "md" })}
                        >
                            <Play className="size-4" />
                            {t("continueTopic", {
                                topic: unitLabelFor(
                                    summary.nextTopic.topicOrder,
                                    summary.nextTopic.name,
                                    course!.unitNoun,
                                    tc,
                                    locale,
                                ),
                            })}
                        </Link>
                    ) : null
                }
            />

            <Progress value={summary.percent} className="h-[3px]" tone="ink" />

            <section className="space-y-3">
                <SectionHeading
                    hint={course!.unitNoun === "book" ? t("chaptersHint") : t("topicsHint")}
                >
                    {course!.unitNoun === "book" ? t("chaptersTitle") : t("topicsTitle")}
                </SectionHeading>

                <ul className="border-t border-border">
                    {topics.map((topic, index) => {
                        const entry = progress.get(topic.id);
                        const percent = entry?.percent ?? 0;
                        // A unit stays done after a cycle reset: the learner did
                        // finish it once, even if the new cycle starts at 0 known.
                        const done = (entry?.cycle ?? 1) > 1;
                        const started = Boolean(entry?.lastActivityAt);

                        return (
                            <ManifestRow
                                key={topic.id}
                                href={`/study/${topic.id}`}
                                index={index + 1}
                                title={unitLabelFor(
                                    topic.topicOrder,
                                    topic.name,
                                    course!.unitNoun,
                                    tc,
                                    locale,
                                )}
                                meta={[
                                    t("topicMeta", {
                                        count: topic.cardCount,
                                        known: entry?.known ?? 0,
                                        cycle: entry?.cycle ?? 1,
                                    }),
                                    entry?.pending
                                        ? t("pending", { count: entry.pending })
                                        : "",
                                ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                tone={done ? "success" : "ink"}
                                status={
                                    done ? (
                                        <Badge tone="success">
                                            <CheckCircle2 className="size-3" />
                                            {t("statusDone")}
                                        </Badge>
                                    ) : started ? (
                                        <Badge tone="accent">{t("statusActive")}</Badge>
                                    ) : (
                                        <Badge tone="neutral">{t("statusNew")}</Badge>
                                    )
                                }
                                percent={percent}
                                trailing={
                                    started ? (
                                        <button
                                            type="button"
                                            className="rounded-[0.25rem] p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                                            title={t("reset")}
                                            aria-label={t("reset")}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                void resetTopic(topic.id);
                                            }}
                                        >
                                            <RotateCcw className="size-3.5" />
                                        </button>
                                    ) : null
                                }
                            />
                        );
                    })}
                </ul>
            </section>
        </div>
    );
}
