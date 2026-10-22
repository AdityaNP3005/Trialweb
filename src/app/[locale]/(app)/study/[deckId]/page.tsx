"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Headphones, Layers, ListChecks } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Card, Deck, StudyAction, StudyMode } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { getCourse } from "@/content/courses";
import { sectionLabelFor, unitLabelFor } from "@/lib/content/labels";
import { buildOptions, pickDistractors } from "@/lib/quiz/distractors";
import {
    insertRepeat,
    MAX_REPEATS_PER_CARD,
    type SessionPlan,
} from "@/lib/study/session";
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
    const tc = useTranslations("common");
    const locale = useLocale();

    const [plan, setPlan] = useState<SessionPlan | null>(null);
    const [deck, setDeck] = useState<Deck | null>(null);
    const [queue, setQueue] = useState<Card[] | null>(null);
    const [index, setIndex] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [mode, setMode] = useState<StudyMode>("flashcard");
    const [pool, setPool] = useState<string[]>([]);
    const [frontPool, setFrontPool] = useState<string[]>([]);
    const [quizPicked, setQuizPicked] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [counters, setCounters] = useState({ next: 0, repeat: 0 });
    const [summary, setSummary] = useState<SessionSummaryData | null>(null);
    const [repeatCounts, setRepeatCounts] = useState<Record<string, number>>({});

    const startedAt = useRef(0);
    const cardShownAt = useRef(0);
    const booted = useRef(false);

    useEffect(() => {
        if (!store || booted.current) return;
        booted.current = true;
        let cancelled = false;

        (async () => {
            try {
                const decks = await store.listDecks();
                const targetId =
                    deckIdParam === "all"
                        ? (decks.find((entry) => entry.isDefault) ?? decks[0])?.id
                        : deckIdParam;

                if (!targetId) {
                    if (!cancelled) setQueue([]);
                    return;
                }

                const [nextDeck, nextPlan, cards] = await Promise.all([
                    store.getDeck(targetId),
                    store.getSession(targetId),
                    store.listCards(targetId, 400),
                ]);

                if (cancelled) return;
                setDeck(nextDeck);
                setPlan(nextPlan);
                setQueue(nextPlan.cards);
                setPool(cards.map((card) => card.meaningId));
                setFrontPool(cards.map((card) => card.front));
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
    }, [store, deckIdParam, tq]);

    const current = queue?.[index] ?? null;
    const totalInSession = queue?.length ?? 0;
    const deckTotal = deck?.cardCount ?? 0;
    const knownNow = (plan?.knownInCycle ?? 0) + counters.next;

    const quizAvailable = useMemo(() => new Set(pool.filter(Boolean)).size >= 4, [pool]);
    const listenAvailable = useMemo(() => new Set(frontPool.filter(Boolean)).size >= 4, [frontPool]);

    // Meaning quiz picks among meanings; listening picks among written words.
    const quizAnswer = current ? (mode === "listen" ? current.front : current.meaningId) : "";

    const quizOptions = useMemo(() => {
        if (!current || mode === "flashcard" || !(mode === "listen" ? listenAvailable : quizAvailable)) return [];
        const source = mode === "listen" ? frontPool : pool;
        const distractors = pickDistractors(source, quizAnswer, 3);
        if (distractors.length < 3) return [];
        return buildOptions(quizAnswer, distractors);
    }, [current, mode, pool, frontPool, quizAnswer, quizAvailable, listenAvailable]);
    // Without four options the page falls back to a flashcard; grade it as one.
    const showingQuiz = mode !== "flashcard" && quizOptions.length === 4;

    function finish(next: number, repeat: number) {
        setSummary({
            total: next + repeat,
            next,
            repeat,
            cycle: plan?.cycle ?? 1,
            cycleReset: plan?.cycleReset ?? false,
            durationMs: Date.now() - startedAt.current,
        });
    }

    async function answer(action: StudyAction) {
        if (!store || !current || busy) return;
        const durationMs = Date.now() - cardShownAt.current;
        setBusy(true);
        setError(null);

        const correct = showingQuiz ? quizPicked === quizAnswer : action === "next";

        try {
            await store.submitAction({
                card: current,
                action,
                mode: showingQuiz ? mode : "flashcard",
                correct,
                durationMs,
                session: plan
                    ? {
                        cycle: plan.cycle,
                        introducedCardIds: [],
                        nextCursor: plan.nextCursor,
                        pendingLeft: plan.pendingLeft,
                        knownInCycle: plan.knownInCycle,
                    }
                    : null,
            });

            const repeats = repeatCounts[current.id] ?? 0;
            if (action === "repeat" && repeats < MAX_REPEATS_PER_CARD) {
                setRepeatCounts((value) => ({ ...value, [current.id]: repeats + 1 }));
                setQueue((value) => (value ? insertRepeat(value, index, current) : value));
            }

            const nextCounts = {
                next: counters.next + (action === "next" ? 1 : 0),
                repeat: counters.repeat + (action === "repeat" ? 1 : 0),
            };
            setCounters(nextCounts);

            if (index + 1 >= totalInSession) {
                finish(nextCounts.next, nextCounts.repeat);
                return;
            }

            setIndex((value) => value + 1);
            setRevealed(false);
            setQuizPicked(null);
            cardShownAt.current = Date.now();
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

            if (event.key.toLowerCase() === "q" && quizAvailable) {
                setMode((value) =>
                    value === "flashcard" ? "quiz" : value === "quiz" ? "listen" : "flashcard",
                );
                setRevealed(false);
                setQuizPicked(null);
                return;
            }

            if (showingQuiz) return;

            if (event.code === "Space" || event.key === "Enter") {
                event.preventDefault();
                if (!revealed) setRevealed(true);
                else void answer("next");
                return;
            }

            if (!revealed) return;
            if (event.key === "1" || event.key.toLowerCase() === "r") void answer("repeat");
            if (event.key === "2" || event.key.toLowerCase() === "n") void answer("next");
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    });

    if (error) {
        return (
            <div className="panel p-6">
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

    if (totalInSession === 0) {
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
            <div className="border-b border-border pb-3">
                <div className="flex items-start gap-3">
                    <Link
                        href="/dashboard"
                        aria-label={t("exitSession")}
                        className="mt-0.5 rounded-[0.25rem] p-1 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>

                    <div className="min-w-0 flex-1">
                        <p className="eyebrow">{t("sessionTitle")}</p>
                        <h1 className="display mt-1 truncate text-xl leading-tight">
                            {deck
                                ? `${sectionLabelFor(
                                    deck.level,
                                    getCourse(deck.courseId).unitNoun,
                                    tc,
                                )} · ${unitLabelFor(
                                    deck.topicOrder,
                                    deck.name,
                                    getCourse(deck.courseId).unitNoun,
                                    tc,
                                    locale,
                                )}`
                                : t("sessionTitle")}
                        </h1>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setMode("flashcard");
                                setRevealed(false);
                                setQuizPicked(null);
                            }}
                            aria-pressed={mode === "flashcard"}
                            className={cn(
                                "inline-flex items-center gap-1 border-b-2 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                                mode === "flashcard"
                                    ? "border-accent text-fg"
                                    : "border-transparent text-muted hover:text-fg",
                            )}
                        >
                            <Layers className="size-3" />
                            {t("modeFlashcard")}
                        </button>
                        <button
                            type="button"
                            disabled={!listenAvailable}
                            title={listenAvailable ? t("modeHint") : tq("notEnoughCards")}
                            aria-pressed={mode === "listen"}
                            onClick={() => {
                                setMode("listen");
                                setRevealed(false);
                                setQuizPicked(null);
                            }}
                            className={cn(
                                "inline-flex items-center gap-1 border-b-2 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors disabled:opacity-40",
                                mode === "listen"
                                    ? "border-accent text-fg"
                                    : "border-transparent text-muted hover:text-fg",
                            )}
                        >
                            <Headphones className="size-3" />
                            {t("modeListen")}
                        </button>
                        <button
                            type="button"
                            disabled={!quizAvailable}
                            title={quizAvailable ? t("modeHint") : tq("notEnoughCards")}
                            aria-pressed={mode === "quiz"}
                            onClick={() => {
                                setMode("quiz");
                                setRevealed(false);
                                setQuizPicked(null);
                            }}
                            className={cn(
                                "inline-flex items-center gap-1 border-b-2 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors disabled:opacity-40",
                                mode === "quiz"
                                    ? "border-accent text-fg"
                                    : "border-transparent text-muted hover:text-fg",
                            )}
                        >
                            <ListChecks className="size-3" />
                            {t("modeQuiz")}
                        </button>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 pl-7 sm:pl-7">
                    <span className="meta">{t("cycleLine", { cycle: plan?.cycle ?? 1 })}</span>
                    <span className="meta">
                        {t("knownLine", { known: knownNow, total: deckTotal })}
                    </span>
                    <span className="meta num">
                        {t("sessionLine", { done: index, total: totalInSession })}
                    </span>
                </div>
            </div>

            <Progress value={index} max={totalInSession} label={t("sessionTitle")} />

            {current ? (
                showingQuiz ? (
                    <QuizView
                        card={current}
                        options={quizOptions}
                        picked={quizPicked}
                        onPick={setQuizPicked}
                        onNext={() => void answer(quizPicked === quizAnswer ? "next" : "repeat")}
                        listen={mode === "listen"}
                        busy={busy}
                        voiceURI={profile?.ttsVoices?.[deck?.courseId ?? ""] ?? profile?.ttsVoiceURI}
                        rate={profile?.ttsRate}
                        lang={deck ? getCourse(deck.courseId).speechLocale : undefined}
                        badgeLabel={
                            deck
                                ? sectionLabelFor(
                                    deck.level,
                                    getCourse(deck.courseId).unitNoun,
                                    tc,
                                )
                                : undefined
                        }
                    />
                ) : (
                    <FlashcardView
                        card={current}
                        revealed={revealed}
                        onReveal={() => setRevealed(true)}
                        onRepeat={() => void answer("repeat")}
                        onNext={() => void answer("next")}
                        busy={busy}
                        voiceURI={profile?.ttsVoices?.[deck?.courseId ?? ""] ?? profile?.ttsVoiceURI}
                        rate={profile?.ttsRate}
                        lang={deck ? getCourse(deck.courseId).speechLocale : undefined}
                        badgeLabel={
                            deck
                                ? sectionLabelFor(
                                    deck.level,
                                    getCourse(deck.courseId).unitNoun,
                                    tc,
                                )
                                : undefined
                        }
                        repeatCount={repeatCounts[current.id] ?? 0}
                        cycle={plan?.cycle}
                    />
                )
            ) : null}
        </div>
    );
}
