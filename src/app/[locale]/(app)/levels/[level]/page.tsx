"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Play, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Deck, DeckProgress } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { getCourseForSection, summarizeSection } from "@/content/courses";
import { getSection } from "@/lib/content/registry";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";

export default function LevelPage() {
    const params = useParams<{ level: string }>();
    const sectionId = params?.level ?? "";
    const router = useRouter();
    const { store } = useStore();
    const t = useTranslations("levels");

    const [decks, setDecks] = useState<Deck[] | null>(null);
    const [progress, setProgress] = useState<Map<string, DeckProgress>>(new Map());

    const section = getSection(sectionId);
    const course = getCourseForSection(sectionId);
    const valid = Boolean(section && course);

    useEffect(() => {
        if (!valid) {
            router.replace("/dashboard");
        }
    }, [valid, router]);

    useEffect(() => {
        if (!store || !valid) return;
        let cancelled = false;
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
    }, [store, valid, sectionId]);

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

    if (!valid) return null;

    if (!decks) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-16" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-fg"
            >
                <ArrowLeft className="size-3.5" />
                {t("back")}
            </Link>

            <section className="surface-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-extrabold tracking-tight">
                                {section!.label}
                            </h1>
                            <Badge tone="accent">{course!.nativeName}</Badge>
                        </div>
                        {course!.unitNoun === "book" ? (
                            <p className="mt-0.5 text-xs text-muted">{section!.title}</p>
                        ) : null}
                        <p className="mt-1 text-sm text-muted">
                            {course!.unitNoun === "book"
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
                                })}
                        </p>
                        <div className="mt-3 h-2 w-full max-w-sm overflow-hidden rounded-full bg-surface-2">
                            <div
                                className="h-full rounded-full bg-accent transition-all"
                                style={{ width: `${summary.percent}%` }}
                            />
                        </div>
                    </div>

                    {summary.nextTopic ? (
                        <Link
                            href={`/study/${summary.nextTopic.id}`}
                            className={buttonStyles({ size: "lg" })}
                        >
                            <Play className="size-4" />
                            {t("continueTopic", { topic: summary.nextTopic.name })}
                        </Link>
                    ) : null}
                </div>
            </section>

            <section className="space-y-3">
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
                        {course!.unitNoun === "book" ? t("chaptersTitle") : t("topicsTitle")}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                        {course!.unitNoun === "book" ? t("chaptersHint") : t("topicsHint")}
                    </p>
                </div>

                <ol className="space-y-2">
                    {topics.map((topic, index) => {
                        const entry = progress.get(topic.id);
                        const percent = entry?.percent ?? 0;
                        const done = percent >= 100;
                        const started = Boolean(entry?.lastActivityAt);

                        return (
                            <li key={topic.id}>
                                <Link
                                    href={`/study/${topic.id}`}
                                    className="surface-card group flex items-center gap-3 p-3 transition hover:border-accent/50 sm:p-4"
                                >
                                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-lg">
                                        {topic.icon ?? index + 1}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-bold">{topic.name}</p>
                                            {done ? (
                                                <Badge tone="success">
                                                    <CheckCircle2 className="size-3" />
                                                    {t("statusDone")}
                                                </Badge>
                                            ) : started ? (
                                                <Badge tone="accent">{t("statusActive")}</Badge>
                                            ) : (
                                                <Badge tone="neutral">{t("statusNew")}</Badge>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-muted">
                                            {t("topicMeta", {
                                                count: topic.cardCount,
                                                known: entry?.known ?? 0,
                                                cycle: entry?.cycle ?? 1,
                                            })}
                                            {entry?.pending
                                                ? ` · ${t("pending", { count: entry.pending })}`
                                                : ""}
                                        </p>
                                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all",
                                                    done ? "bg-success" : "bg-accent",
                                                )}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1">
                                        {started ? (
                                            <span
                                                className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
                                                title={t("reset")}
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    if (!window.confirm(t("resetBody"))) return;
                                                    void store
                                                        ?.resetDeckCycle(topic.id)
                                                        .then(async () => {
                                                            const next = await store.listDeckProgress();
                                                            setProgress(
                                                                new Map(
                                                                    next.map((item) => [
                                                                        item.deckId,
                                                                        item,
                                                                    ]),
                                                                ),
                                                            );
                                                        });
                                                }}
                                            >
                                                <RotateCcw className="size-3.5" />
                                            </span>
                                        ) : null}
                                        <Play className="size-4 text-muted transition group-hover:text-accent" />
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ol>
            </section>
        </div>
    );
}
