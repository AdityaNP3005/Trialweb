"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Layers, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Card, ReviewRating, StudyMode } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { previewIntervals } from "@/lib/srs/fsrs";
import {
    buildOptions,
    pickDistractors,
    ratingForQuiz,
} from "@/lib/quiz/distractors";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress, Skeleton } from "@/components/ui/progress";
import { FlashcardView } from "@/components/study/flashcard-view";
import { QuizView } from "@/components/study/quiz-view";
import {
    SessionSummary,
    type SessionSummaryData,
} from "@/components/study/session-summary";
import { cn } from "@/lib/utils/cn";

export default function StudyPage() {
    const params = useParams<{ deckId: string }>();
    const deckIdParam = params?.deckId ?? "all";
    const { store, profile } = useStore();
    const t = useTranslations("study");
    const tq = useTranslations("quiz");
    const router = useRouter();

    const [queue, setQueue] = useState<Card[] | null>(null);
    const [deckName, setDeckName] = useState<string | null>(null);
    const [index, setIndex] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [mode, setMode] = useState<StudyMode>("flashcard");
    const [pool, setPool] = useState<string[]>([]);
    const [quizPicked, setQuizPicked] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({ correct: 0, total: 0, newCards: 0 });
    const [summary, setSummary] = useState<SessionSummaryData | null>(null);

    // Timestamps are set inside effects/handlers, never during render.
    const startedAt = useRef(0);
    const cardShownAt = useRef(0);

    useEffect(() => {
        if (!store) return;
        let cancelled = false;

        (async () => {
            try {
                const today = await store.getTodayStat();
                const newLimit = Math.max(0, (profile?.newPerDay ?? 10) - today.newCards);

                const result = await store.getStudyQueue({
                    deckId: deckIdParam === "all" ? null : deckIdParam,
                    reviewLimit: 100,
                    newLimit,
                });

                let distractors: string[] = result.cards.map((card) => card.meaningId);

                if (deckIdParam !== "all") {
                    const [deck, cards] = await Promise.all([
                        store.getDeck(deckIdParam),
                        store.listCards(deckIdParam, 80),
                    ]);
                    if (!cancelled) setDeckName(deck?.name ?? null);
                    distractors = cards.map((card) => card.meaningId);
                }

                if (cancelled) return;
                setPool(distractors);
                setQueue(result.cards);
                startedAt.current = Date.now();
                cardShownAt.current = Date.now();
            } catch (cause) {
                if (!cancelled) {
                    setError(cause instanceof Error ? cause.message : tq("notEnoughCards"));
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [store, profile, deckIdParam, tq]);

    const current = queue?.[index] ?? null;
    const total = queue?.length ?? 0;

    const quizAvailable = useMemo(() => new Set(pool.filter(Boolean)).size >= 4, [pool]);

    const quizOptions = useMemo(() => {
        if (!current || mode !== "quiz" || !quizAvailable) return [];
        const distractors = pickDistractors(pool, current.meaningId, 3);
        if (distractors.length < 3) return [];
        return buildOptions(current.meaningId, distractors);
    }, [current, mode, pool, quizAvailable]);

    const preview = useMemo(
        () => (current ? previewIntervals(current.srs) : null),
        [current],
    );

    function advance(correct: boolean) {
        const next = {
            correct: stats.correct + (correct ? 1 : 0),
            total: stats.total + 1,
            newCards: stats.newCards + (current?.isNew ? 1 : 0),
        };
        setStats(next);

        if (index + 1 >= total) {
            setSummary({ ...next, durationMs: Date.now() - startedAt.current });
            return;
        }

        setIndex((value) => value + 1);
        setRevealed(false);
        setQuizPicked(null);
        cardShownAt.current = Date.now();
    }

    async function handleRate(rating: ReviewRating) {
        if (!store || !current || busy) return;
        const durationMs = Date.now() - cardShownAt.current;
        setBusy(true);
        setError(null);
        try {
            await store.submitReview({
                card: current,
                rating,
                mode: "flashcard",
                correct: rating >= 3,
                durationMs,
            });
            advance(rating >= 3);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "error");
        } finally {
            setBusy(false);
        }
    }

    async function handleQuizNext() {
        if (!store || !current || busy || quizPicked === null) return;
        const correct = quizPicked === current.meaningId;
        const durationMs = Date.now() - cardShownAt.current;
        setBusy(true);
        setError(null);
        try {
            await store.submitReview({
                card: current,
                rating: ratingForQuiz(correct, durationMs),
                mode: "quiz",
                correct,
                durationMs,
            });
            advance(correct);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "error");
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            const target = event.target as HTMLElement | null;
            if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
                return;
            }
            if (summary) return;

            if (event.key === "Escape") {
                if (window.confirm(t("exitConfirm"))) router.push("/dashboard");
                return;
            }

            if (event.key.toLowerCase() === "q" && quizAvailable) {
                setMode((value) => (value === "flashcard" ? "quiz" : "flashcard"));
                setRevealed(false);
                setQuizPicked(null);
                return;
            }

            if (mode !== "flashcard") return;

            if (event.code === "Space" || event.key === "Enter") {
                event.preventDefault();
                if (!revealed) setRevealed(true);
                return;
            }

            if (revealed && ["1", "2", "3", "4"].includes(event.key)) {
                void handleRate(Number(event.key) as ReviewRating);
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    });

    if (error) {
        return (
            <div className="surface-card p-6">
                <p className="text-sm text-danger">{error}</p>
                <Link
                    href="/dashboard"
                    className={buttonStyles({ variant: "ghost", size: "sm", className: "mt-3" })}
                >
                    <ArrowLeft className="size-3.5" />
                    {t("backToDashboard")}
                </Link>
            </div>
        );
    }

    if (!queue) {
        return (
            <div className="mx-auto max-w-xl space-y-4">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-80" />
            </div>
        );
    }

    if (total === 0) {
        return (
            <EmptyState
                title={t("emptyQueue")}
                action={
                    <Link href="/dashboard" className={buttonStyles({ size: "sm" })}>
                        {t("backToDashboard")}
                    </Link>
                }
            />
        );
    }

    if (summary) {
        return <SessionSummary data={summary} />;
    }

    return (
        <div className="mx-auto max-w-xl space-y-4">
            <div className="flex items-center gap-3">
                <Link
                    href="/dashboard"
                    aria-label={t("exitSession")}
                    className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
                >
                    <ArrowLeft className="size-4" />
                </Link>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{deckName ?? t("sessionTitle")}</p>
                    <p className="text-[11px] text-muted">
                        {t("deckProgress", { done: index, total })} ·{" "}
                        {t("remaining", { count: total - index })}
                    </p>
                </div>

                <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
                    <button
                        type="button"
                        onClick={() => {
                            setMode("flashcard");
                            setRevealed(false);
                            setQuizPicked(null);
                        }}
                        className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition",
                            mode === "flashcard"
                                ? "bg-accent text-accent-fg"
                                : "text-muted hover:text-fg",
                        )}
                    >
                        <Layers className="size-3" />
                        {t("modeFlashcard")}
                    </button>
                    <button
                        type="button"
                        disabled={!quizAvailable}
                        title={quizAvailable ? t("modeHint") : tq("notEnoughCards")}
                        onClick={() => {
                            setMode("quiz");
                            setRevealed(false);
                            setQuizPicked(null);
                        }}
                        className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition disabled:opacity-40",
                            mode === "quiz" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                        )}
                    >
                        <ListChecks className="size-3" />
                        {t("modeQuiz")}
                    </button>
                </div>
            </div>

            <Progress value={index} max={total} label={t("sessionTitle")} />

            {current ? (
                mode === "quiz" && quizOptions.length === 4 ? (
                    <QuizView
                        card={current}
                        options={quizOptions}
                        picked={quizPicked}
                        onPick={setQuizPicked}
                        onNext={handleQuizNext}
                        busy={busy}
                        voiceURI={profile?.ttsVoiceURI}
                        rate={profile?.ttsRate}
                    />
                ) : (
                    <FlashcardView
                        card={current}
                        revealed={revealed}
                        onReveal={() => setRevealed(true)}
                        preview={preview!}
                        onRate={handleRate}
                        busy={busy}
                        voiceURI={profile?.ttsVoiceURI}
                        rate={profile?.ttsRate}
                    />
                )
            ) : null}
        </div>
    );
}
