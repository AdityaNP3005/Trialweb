"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Card } from "@/types";
import { CEFR_LEVELS } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { loadContentCards, topicsForLevel } from "@/lib/content/registry";
import { shuffle } from "@/lib/quiz/distractors";
import {
    expectedSpelling,
    gradeSpelling,
    SPELLING_POINTS,
    type SpellingResult,
} from "@/lib/writing/spelling";
import { Button } from "@/components/ui/button";
import { TtsButton } from "@/components/study/tts-button";
import { cn } from "@/lib/utils/cn";
import { UmlautKeys } from "./umlaut-keys";

const ROUND = 10;

type Answered = { card: Card; answer: string; result: SpellingResult };

/** Words worth spelling: no patterns with "…" placeholders. */
const spellable = (card: Card) => !/[.…]{2,}|…/.test(card.front);

/**
 * Spelling drill: shows the meaning in the UI language and asks for the German
 * word. Words come from cards already marked as known (default) or a band.
 */
export function SpellingPractice() {
    const t = useTranslations("writing.de");
    const locale = useLocale();
    const { store, profile } = useStore();
    const [source, setSource] = useState<"progress" | "band">("progress");
    const [band, setBand] = useState<string>("A1");
    const [known, setKnown] = useState<Card[] | null>(null);
    const [queue, setQueue] = useState<Card[] | null>(null);
    const [index, setIndex] = useState(0);
    const [answer, setAnswer] = useState("");
    const [answered, setAnswered] = useState<Answered[]>([]);
    const [checked, setChecked] = useState<SpellingResult | null>(null);
    const [loading, setLoading] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!store) return;
        let cancelled = false;
        (async () => {
            const ids = await store.listKnownCardIds("de");
            const decks = [...new Set(ids.map((id) => id.replace(/-\d+$/, "")))];
            const cards = (await Promise.all(decks.map((deckId) => store.listCards(deckId, 20000)))).flat();
            const wanted = new Set(ids);
            if (!cancelled) setKnown(cards.filter((card) => wanted.has(card.id) && spellable(card)));
        })().catch(() => {
            if (!cancelled) setKnown([]);
        });
        return () => {
            cancelled = true;
        };
    }, [store]);

    useEffect(() => {
        if (queue) input.current?.focus();
    }, [queue, index]);

    function begin(cards: Card[]) {
        setQueue(shuffle(cards).slice(0, ROUND));
        setIndex(0);
        setAnswer("");
        setAnswered([]);
        setChecked(null);
    }

    async function start() {
        if (source === "progress") {
            begin(known ?? []);
            return;
        }
        setLoading(true);
        try {
            const cards = (await Promise.all(topicsForLevel(band).map((unit) => loadContentCards(unit.id)))).flat();
            begin(cards.filter(spellable));
        } finally {
            setLoading(false);
        }
    }

    const current = queue?.[index] ?? null;
    const meaning = (card: Card) => (locale === "en" ? card.meaningEn : card.meaningId);

    function check() {
        if (!current || checked) return;
        const result = gradeSpelling(answer, expectedSpelling(current));
        setChecked(result);
        setAnswered((value) => [...value, { card: current, answer, result }]);
    }

    function next() {
        setChecked(null);
        setAnswer("");
        setIndex((value) => value + 1);
    }

    // Results screen once every word of the round is answered.
    if (queue && index >= queue.length) {
        const score = answered.reduce((sum, entry) => sum + SPELLING_POINTS[entry.result.verdict], 0);
        const misses = answered.filter((entry) => entry.result.verdict !== "correct").map((entry) => entry.card);
        return (
            <div className="space-y-4">
                <p className="display text-2xl">{t("score", { score, total: answered.length })}</p>
                <ul className="border-t border-border">
                    {answered.map((entry, position) => (
                        <li key={position} className="flex items-start gap-3 border-b border-border py-2 text-sm">
                            <VerdictIcon verdict={entry.result.verdict} />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">{entry.result.expected}</p>
                                <p className="text-xs text-muted">
                                    {meaning(entry.card)} · {t("yourAnswer")}: {entry.answer || "—"}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void start()}>{t("again")}</Button>
                    {misses.length ? (
                        <Button variant="secondary" onClick={() => begin(misses)}>
                            {t("retryWrong")}
                        </Button>
                    ) : null}
                </div>
            </div>
        );
    }

    if (current) {
        return (
            <div className="mx-auto max-w-xl space-y-4">
                <p className="meta">{t("questionOf", { index: index + 1, total: queue!.length })}</p>
                <div className="panel space-y-4 p-5">
                    <div className="text-center">
                        <p className="text-xl font-semibold leading-snug">{meaning(current)}</p>
                        {/^(der|die|das) /.test(expectedSpelling(current)) ? (
                            <p className="meta mt-1">{t("withArticle")}</p>
                        ) : null}
                    </div>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (checked) next();
                            else check();
                        }}
                        className="space-y-2"
                    >
                        <input
                            ref={input}
                            value={answer}
                            onChange={(event) => setAnswer(event.target.value)}
                            readOnly={Boolean(checked)}
                            placeholder={t("typeGerman")}
                            autoCapitalize="off"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            lang="de"
                            className="h-12 w-full rounded-[0.375rem] border border-border bg-surface px-3 text-lg outline-none focus:border-fg/50"
                        />
                        <UmlautKeys target={() => input.current} onInsert={setAnswer} />
                        {checked ? (
                            <div
                                className={cn(
                                    "space-y-1 rounded-[0.375rem] border p-3 text-sm",
                                    checked.verdict === "correct" && "border-success/40 text-success",
                                    checked.verdict === "almost" && "border-warning/50 text-warning",
                                    checked.verdict === "wrong" && "border-danger/40 text-danger",
                                )}
                                aria-live="polite"
                            >
                                <p className="flex items-center gap-2 font-semibold">
                                    <VerdictIcon verdict={checked.verdict} />
                                    {t(checked.verdict)}
                                </p>
                                {checked.issue ? <p className="text-fg">{t(`issue_${checked.issue}`)}</p> : null}
                                <p className="flex items-center gap-2 text-fg">
                                    {t("expected", { answer: checked.expected })}
                                    <TtsButton
                                        text={checked.expected}
                                        lang="de-DE"
                                        voiceURI={profile?.ttsVoices?.de ?? profile?.ttsVoiceURI ?? null}
                                        rate={profile?.ttsRate}
                                    />
                                </p>
                                {current.readingId ? <p className="meta">{current.readingId}</p> : null}
                            </div>
                        ) : null}
                        <Button type="submit" className="w-full">
                            {checked ? (index + 1 < queue!.length ? t("nextWord") : t("seeResult")) : t("check")}
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    const knownCount = known?.length ?? 0;
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted">{t("spellingIntro")}</p>
            <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm">
                    <input
                        type="radio"
                        name="spelling-source"
                        checked={source === "progress"}
                        onChange={() => setSource("progress")}
                        className="mt-1"
                    />
                    <span>
                        <span className="font-semibold">{t("sourceProgress")}</span>
                        <span className="meta ml-2">
                            {known ? t("sourceProgressHint", { count: knownCount }) : "…"}
                        </span>
                    </span>
                </label>
                <label className="flex flex-wrap items-center gap-2 text-sm">
                    <input
                        type="radio"
                        name="spelling-source"
                        checked={source === "band"}
                        onChange={() => setSource("band")}
                    />
                    <span className="font-semibold">{t("sourceBand")}</span>
                    <select
                        value={band}
                        onChange={(event) => {
                            setBand(event.target.value);
                            setSource("band");
                        }}
                        className="h-8 rounded-[0.25rem] border border-border bg-surface px-2 text-sm"
                    >
                        {CEFR_LEVELS.map((level) => (
                            <option key={level} value={level}>
                                {level}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {source === "progress" && known && knownCount === 0 ? (
                <p className="rounded-[0.375rem] border border-dashed border-border p-3 text-sm text-muted">
                    {t("noKnownWords")}
                </p>
            ) : null}
            <Button
                onClick={() => void start()}
                loading={loading}
                disabled={source === "progress" && (!known || knownCount === 0)}
            >
                {t("start")}
            </Button>
        </div>
    );
}

function VerdictIcon({ verdict }: { verdict: SpellingResult["verdict"] }) {
    if (verdict === "correct") return <Check className="size-4 shrink-0 text-success" />;
    if (verdict === "almost") return <Check className="size-4 shrink-0 text-warning" />;
    return <X className="size-4 shrink-0 text-danger" />;
}
