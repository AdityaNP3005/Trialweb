"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
    analyzeText,
    checkFormField,
    checkReformulation,
    countWords,
    maxPoints,
    PASS_RATIO,
    rubricFor,
    scoreRubric,
    suggestRatings,
    type FormPart,
    type Level,
    type Localized,
    type ReformPart,
    type SchreibenSet,
    type TextPart,
} from "@/lib/writing/schreiben";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { UmlautKeys } from "./umlaut-keys";

/** Everything a learner typed for one set, keyed by part id. */
type Answers = Record<string, string | string[]>;
/** Learner overrides: rubric levels per text part, points per reformulation item. */
type Ratings = Record<string, Record<string, Level>>;
type ReformOverrides = Record<string, Record<number, 0 | 1 | 2>>;

const draftKey = (setId: string) => `goabroad.schreiben.${setId}`;

function readDraft(setId: string): Answers {
    try {
        return JSON.parse(window.localStorage.getItem(draftKey(setId)) ?? "{}") as Answers;
    } catch {
        return {};
    }
}

function writeDraft(setId: string, answers: Answers) {
    try {
        window.localStorage.setItem(draftKey(setId), JSON.stringify(answers));
    } catch {
        // Private mode or full storage: the draft simply is not kept.
    }
}

const round = (value: number) => Math.round(value * 10) / 10;

/** One Goethe-style Schreiben set: write all parts, then score them. */
export function SchreibenExam({ set }: { set: SchreibenSet }) {
    const t = useTranslations("writing.de");
    const locale = useLocale();
    const local = (text: Localized) => (locale === "en" ? text.en : text.id);
    const [answers, setAnswers] = useState<Answers>({});
    const [phase, setPhase] = useState<"write" | "review">("write");
    const [ratings, setRatings] = useState<Ratings>({});
    const [reformOverrides, setReformOverrides] = useState<ReformOverrides>({});
    const [startedAt] = useState(() => Date.now());
    const [now, setNow] = useState(() => Date.now());
    const loaded = useRef(false);

    useEffect(() => {
        setAnswers(readDraft(set.id));
        loaded.current = true;
    }, [set.id]);

    useEffect(() => {
        if (loaded.current) writeDraft(set.id, answers);
    }, [set.id, answers]);

    useEffect(() => {
        if (phase !== "write") return;
        const timer = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(timer);
    }, [phase]);

    const totalMinutes = set.parts.reduce((sum, part) => sum + part.minutes, 0);
    const text = (id: string) => (typeof answers[id] === "string" ? (answers[id] as string) : "");
    const list = (id: string, length: number) => {
        const value = Array.isArray(answers[id]) ? (answers[id] as string[]) : [];
        return Array.from({ length }, (_, index) => value[index] ?? "");
    };

    /* ---------------- scoring ---------------- */

    const results = useMemo(() => {
        return set.parts.map((part) => {
            if (part.type === "form") {
                const values = list(part.id, part.fields.length);
                const correct = part.fields.map((field, index) => checkFormField(values[index], field.answers));
                return { part, max: part.fields.length, score: correct.filter(Boolean).length, correct };
            }
            if (part.type === "reform") {
                const values = list(part.id, part.items.length);
                const auto = part.items.map((item, index) => checkReformulation(values[index], item));
                const points = auto.map((value, index) => reformOverrides[part.id]?.[index] ?? value);
                return { part, max: part.items.length * 2, score: points.reduce<number>((sum, value) => sum + value, 0), auto, points };
            }
            const rubric = rubricFor(part.rubric, part.points.length);
            const analysis = analyzeText(part, text(part.id));
            const suggested = suggestRatings(part, rubric, analysis);
            const chosen: Record<string, Level> = { ...suggested, ...ratings[part.id] };
            if (analysis.tooShort) {
                // Official rule: under 50 % of the words fails the task criterion.
                for (const criterion of rubric.criteria) if (criterion.gate) chosen[criterion.id] = "E";
            }
            return { part, max: maxPoints(rubric), score: scoreRubric(rubric, chosen), rubric, analysis, suggested, chosen };
        });
        // `list`/`text` read from `answers`, which is a dependency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [set.parts, answers, ratings, reformOverrides]);

    const total = results.reduce((sum, result) => sum + result.score, 0);
    // Criteria still without a level count as 0 until the learner rates them.
    const unrated = results.reduce((count, result) => {
        if (!("rubric" in result) || !result.rubric || result.score === 0) return count;
        return count + result.rubric.criteria.filter((criterion) => !result.chosen[criterion.id]).length;
    }, 0);
    const max = results.reduce((sum, result) => sum + result.max, 0);
    const percent = max ? Math.round((total / max) * 100) : 0;

    /* ---------------- rendering ---------------- */

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="meta">
                    {phase === "write"
                        ? t("elapsed", { used: Math.floor((now - startedAt) / 60000), total: totalMinutes })
                        : t("totalScore", { score: round(total), max, percent })}
                </p>
                {phase === "write" ? <p className="meta">{t("draftSaved")}</p> : null}
            </div>

            {set.parts.map((part, position) => (
                <section key={part.id} className="panel space-y-4 p-5">
                    <header className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="display text-xl">{part.title}</h2>
                        <span className="meta">
                            {t("minutes", { count: part.minutes })}
                            {part.type === "text" ? ` · ${t("wordsTarget", { count: part.words })}` : ""}
                            {phase === "review" ? ` · ${t("partScore", { score: round(results[position].score), max: results[position].max })}` : ""}
                        </span>
                    </header>

                    <p className="text-sm leading-relaxed" lang="de">{part.situation}</p>
                    <details className="text-xs text-muted">
                        <summary className="cursor-pointer select-none">{t("showTranslation")}</summary>
                        <p className="mt-1">{local(part.hint)}</p>
                    </details>

                    {part.type === "text" ? (
                        <TextTask
                            part={part}
                            value={text(part.id)}
                            onChange={(value) => setAnswers((current) => ({ ...current, [part.id]: value }))}
                            readOnly={phase === "review"}
                            local={local}
                        />
                    ) : part.type === "form" ? (
                        <FormTask
                            part={part}
                            values={list(part.id, part.fields.length)}
                            onChange={(values) => setAnswers((current) => ({ ...current, [part.id]: values }))}
                            review={phase === "review" ? (results[position] as { correct: boolean[] }).correct : null}
                        />
                    ) : (
                        <ReformTask
                            part={part}
                            values={list(part.id, part.items.length)}
                            onChange={(values) => setAnswers((current) => ({ ...current, [part.id]: values }))}
                            review={phase === "review" ? (results[position] as { auto: (0 | 1 | 2)[]; points: (0 | 1 | 2)[] }) : null}
                            onOverride={(index, points) =>
                                setReformOverrides((current) => ({
                                    ...current,
                                    [part.id]: { ...current[part.id], [index]: points },
                                }))
                            }
                        />
                    )}

                    {phase === "review" && part.type === "text" ? (
                        <TextReview
                            part={part}
                            result={results[position] as TextResult}
                            local={local}
                            onRate={(criterion, level) =>
                                setRatings((current) => ({
                                    ...current,
                                    [part.id]: { ...current[part.id], [criterion]: level },
                                }))
                            }
                        />
                    ) : null}
                </section>
            ))}

            {phase === "write" ? (
                <Button
                    className="w-full"
                    onClick={() => {
                        setPhase("review");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                >
                    {t("finish")}
                </Button>
            ) : (
                <div className="space-y-3">
                    <div
                        className={cn(
                            "rounded-[0.375rem] border p-4",
                            total / max >= PASS_RATIO ? "border-success/40" : "border-warning/50",
                        )}
                    >
                        <p className="display text-2xl">{t("totalScore", { score: round(total), max, percent })}</p>
                        <p className={cn("text-sm font-semibold", total / max >= PASS_RATIO ? "text-success" : "text-warning")}>
                            {total / max >= PASS_RATIO ? t("passed") : t("notPassed")}
                        </p>
                        {unrated > 0 ? <p className="mt-1 text-sm text-warning">{t("unratedLeft", { count: unrated })}</p> : null}
                        <p className="meta mt-2">{t("disclaimer")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => setPhase("write")}>
                            {t("editAgain")}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setAnswers({});
                                setRatings({});
                                setReformOverrides({});
                                setPhase("write");
                            }}
                        >
                            {t("restart")}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

type TextResult = {
    max: number;
    score: number;
    rubric: ReturnType<typeof rubricFor>;
    analysis: ReturnType<typeof analyzeText>;
    suggested: Record<string, Level>;
    chosen: Record<string, Level>;
};

function TextTask({
    part,
    value,
    onChange,
    readOnly,
    local,
}: {
    part: TextPart;
    value: string;
    onChange: (value: string) => void;
    readOnly: boolean;
    local: (text: Localized) => string;
}) {
    const t = useTranslations("writing.de");
    const area = useRef<HTMLTextAreaElement>(null);
    const words = countWords(value);
    const short = words > 0 && words < part.words * 0.5;

    return (
        <div className="space-y-3">
            {part.stimulus?.length ? (
                <div className="space-y-2 border-l-2 border-border pl-3 text-sm italic" lang="de">
                    {part.stimulus.map((line) => (
                        <p key={line}>{line}</p>
                    ))}
                </div>
            ) : null}
            <div>
                <p className="eyebrow">{t("contentPoints")}</p>
                <ul className="mt-1 space-y-1 text-sm">
                    {part.points.map((point) => (
                        <li key={point.de} className="flex gap-2">
                            <span className="text-muted">–</span>
                            <span>
                                <span lang="de">{point.de}</span>
                                <span className="meta block">{local(point.hint)}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
            <textarea
                ref={area}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                readOnly={readOnly}
                rows={Math.min(16, Math.max(5, Math.round(part.words / 18)))}
                lang="de"
                spellCheck={false}
                className="w-full rounded-[0.375rem] border border-border bg-surface p-3 text-sm leading-relaxed outline-none focus:border-fg/50"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
                {readOnly ? <span /> : <UmlautKeys target={() => area.current} onInsert={onChange} />}
                <span className={cn("meta num", short && "text-danger")}>
                    {t("wordCount", { count: words, target: part.words })}
                </span>
            </div>
            {short ? <p className="text-xs text-danger">{t("tooShortWarning")}</p> : null}
        </div>
    );
}

function TextReview({
    part,
    result,
    local,
    onRate,
}: {
    part: TextPart;
    result: TextResult;
    local: (text: Localized) => string;
    onRate: (criterion: string, level: Level) => void;
}) {
    const t = useTranslations("writing.de");
    const { analysis, rubric, chosen, suggested } = result;
    const gateZero = rubric.criteria.some(
        (criterion) => criterion.gate && criterion.options.find((option) => option.level === chosen[criterion.id])?.points === 0,
    );

    return (
        <div className="space-y-4 border-t border-border pt-4">
            <div className="space-y-1 text-sm">
                <p className="eyebrow">{t("autoChecks")}</p>
                <p className={cn("num", analysis.tooShort && "text-danger")}>
                    {t("wordCount", { count: analysis.words, target: part.words })}
                    {analysis.tooShort ? ` · ${t("tooShortWarning")}` : ""}
                </p>
                <ul className="space-y-0.5">
                    {part.points.map((point, index) => (
                        <li key={point.de} className="flex items-start gap-2">
                            {analysis.covered[index] ? (
                                <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                            ) : (
                                <X className="mt-0.5 size-3.5 shrink-0 text-danger" />
                            )}
                            <span>
                                {point.de}{" "}
                                <span className="meta">
                                    {analysis.covered[index] ? t("pointCovered") : t("pointMissing")}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
                {part.letter ? (
                    <p className="meta">
                        {t("greeting")}: {analysis.greeting ? t("present") : t("missing")} · {t("closing")}:{" "}
                        {analysis.closing ? t("present") : t("missing")}
                    </p>
                ) : null}
                {analysis.registerIssue ? <p className="text-xs text-danger">{t("registerIssue")}</p> : null}
                <p className="meta">
                    {analysis.connectors.length
                        ? t("connectors", { list: analysis.connectors.join(", ") })
                        : t("noConnectors")}
                </p>
            </div>

            <details className="text-sm">
                <summary className="cursor-pointer select-none font-semibold">{t("modelAnswer")}</summary>
                <p className="mt-2 whitespace-pre-line border-l-2 border-border pl-3 leading-relaxed" lang="de">
                    {part.model}
                </p>
            </details>

            <div className="space-y-3">
                <div>
                    <p className="eyebrow">{t("rubric")}</p>
                    <p className="meta">{t("rateYourself")}</p>
                </div>
                {rubric.criteria.map((criterion) => (
                    <div key={criterion.id} className="space-y-1">
                        <p className="text-sm font-semibold">
                            {criterion.name} <span className="font-normal text-muted">· {local(criterion.label)}</span>
                            {chosen[criterion.id] ? null : (
                                <span className="ml-2 font-normal text-warning">{t("notRated")}</span>
                            )}
                        </p>
                        <div className="grid gap-1 sm:grid-cols-2">
                            {criterion.options.map((option) => {
                                const active = chosen[criterion.id] === option.level;
                                const forced = analysis.tooShort && criterion.gate;
                                return (
                                    <button
                                        key={option.level}
                                        type="button"
                                        disabled={forced}
                                        onClick={() => onRate(criterion.id, option.level)}
                                        aria-pressed={active}
                                        className={cn(
                                            "rounded-[0.25rem] border px-2 py-1.5 text-left text-xs transition-colors disabled:opacity-60",
                                            active ? "border-fg bg-surface-2" : "border-border hover:border-fg/40",
                                        )}
                                    >
                                        <span className="font-mono font-semibold">
                                            {option.level} · {option.points * rubric.multiplier}
                                        </span>
                                        {suggested[criterion.id] === option.level ? (
                                            <span className="ml-1 text-accent">({t("suggested")})</span>
                                        ) : null}
                                        <span className="block text-muted">{local(option.description)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
                {gateZero ? <p className="text-xs text-danger">{t("gateZero")}</p> : null}
            </div>
        </div>
    );
}

function FormTask({
    part,
    values,
    onChange,
    review,
}: {
    part: FormPart;
    values: string[];
    onChange: (values: string[]) => void;
    review: boolean[] | null;
}) {
    const t = useTranslations("writing.de");
    return (
        <dl className="divide-y divide-border border-y border-border text-sm" lang="de">
            {part.given.map((row) => (
                <div key={row.label} className="grid gap-1 py-2 sm:grid-cols-[14rem_1fr]">
                    <dt className="text-muted">{row.label}</dt>
                    <dd>{row.value}</dd>
                </div>
            ))}
            {part.fields.map((field, index) => (
                <div key={field.label} className="grid gap-1 py-2 sm:grid-cols-[14rem_1fr]">
                    <dt className="text-muted">
                        ({index + 1}) {field.label}
                    </dt>
                    <dd className="space-y-1">
                        <input
                            value={values[index]}
                            readOnly={review !== null}
                            onChange={(event) => {
                                const next = [...values];
                                next[index] = event.target.value;
                                onChange(next);
                            }}
                            className="h-9 w-full rounded-[0.25rem] border border-border bg-surface px-2 outline-none focus:border-fg/50"
                        />
                        {review ? (
                            <p className={cn("flex items-center gap-1 text-xs", review[index] ? "text-success" : "text-danger")}>
                                {review[index] ? <Check className="size-3" /> : <X className="size-3" />}
                                {review[index] ? "1" : `0 · ${t("formAnswer", { answer: field.answers[0] })}`}
                            </p>
                        ) : null}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function ReformTask({
    part,
    values,
    onChange,
    review,
    onOverride,
}: {
    part: ReformPart;
    values: string[];
    onChange: (values: string[]) => void;
    review: { auto: (0 | 1 | 2)[]; points: (0 | 1 | 2)[] } | null;
    onOverride: (index: number, points: 0 | 1 | 2) => void;
}) {
    const t = useTranslations("writing.de");
    return (
        <ol className="space-y-4 text-sm" lang="de">
            <li className="rounded-[0.25rem] bg-surface-2/60 p-3">
                <p className="eyebrow">{t("example")}</p>
                <p className="mt-1">{part.example.original}</p>
                <p className="meta mt-1">
                    {t("keyword")}: <strong>{part.example.keyword}</strong>
                </p>
                <p className="mt-1 italic">{part.example.answer}</p>
            </li>
            {part.items.map((item, index) => (
                <li key={item.original} className="space-y-1">
                    <p>
                        <span className="num mr-1 text-muted">{index + 1}.</span>
                        {item.original}
                    </p>
                    <p className="meta">
                        {t("keyword")}: <strong className="text-fg">{item.keyword}</strong>
                    </p>
                    <input
                        value={values[index]}
                        readOnly={review !== null}
                        onChange={(event) => {
                            const next = [...values];
                            next[index] = event.target.value;
                            onChange(next);
                        }}
                        className="h-9 w-full rounded-[0.25rem] border border-border bg-surface px-2 outline-none focus:border-fg/50"
                    />
                    {review ? (
                        <div className="space-y-1 text-xs">
                            <p className="text-muted">{t("acceptedAnswers", { answers: item.answers.join(" / ") })}</p>
                            <div className="flex items-center gap-2">
                                <span className="meta">{t("reformAuto", { points: review.auto[index] })}</span>
                                {([2, 1, 0] as const).map((points) => (
                                    <button
                                        key={points}
                                        type="button"
                                        onClick={() => onOverride(index, points)}
                                        aria-pressed={review.points[index] === points}
                                        className={cn(
                                            "h-6 min-w-6 rounded-[0.25rem] border px-1.5 font-mono",
                                            review.points[index] === points ? "border-fg bg-surface-2" : "border-border",
                                        )}
                                    >
                                        {points}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </li>
            ))}
        </ol>
    );
}
