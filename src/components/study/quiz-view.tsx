"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Card } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { TtsButton } from "./tts-button";

const letters = ["A", "B", "C", "D", "E", "F"];

export function QuizView({
    card,
    options,
    picked,
    onPick,
    onNext,
    busy,
    voiceURI,
    rate,
    lang,
    badgeLabel,
}: {
    card: Card;
    options: string[];
    picked: string | null;
    onPick: (option: string) => void;
    onNext: () => void;
    busy: boolean;
    voiceURI?: string | null;
    rate?: number;
    lang?: string;
    badgeLabel?: string;
}) {
    const t = useTranslations("quiz");
    const correct = card.meaningId;
    const answered = picked !== null;
    const isCorrect = picked === correct;

    return (
        <div className="space-y-4">
            <div className="panel flex min-h-[11rem] flex-col items-center justify-center p-5 text-center">
                <span className="eyebrow">{badgeLabel ?? card.level}</span>
                <div className="mt-3 flex items-center gap-3">
                    <p
                        className={cn(
                            "tracking-tight",
                            card.script === "hanzi"
                                ? "font-cjk font-medium text-[2.5rem] leading-tight sm:text-[3rem]"
                                : "display text-[2rem] leading-tight sm:text-[2.5rem]",
                        )}
                    >
                        {card.front}
                    </p>
                    <TtsButton
                        text={card.front}
                        voiceURI={voiceURI}
                        rate={rate}
                        lang={lang}
                    />
                </div>
                <p className="meta mt-3">{t("question")}</p>
            </div>

            <ul className="border-t border-border">
                {options.map((option, index) => {
                    const isAnswer = option === correct;
                    const isPicked = option === picked;

                    return (
                        <li key={option} className="border-b border-border">
                            <button
                                type="button"
                                disabled={answered || busy}
                                onClick={() => onPick(option)}
                                className={cn(
                                    "flex w-full items-center gap-3 py-3 pr-3 text-left text-sm transition-colors",
                                    !answered && "hover:bg-surface-2/60",
                                    answered && isAnswer && "text-success",
                                    answered && isPicked && !isAnswer && "text-danger",
                                    answered && !isAnswer && !isPicked && "text-muted",
                                )}
                            >
                                <span
                                    className={cn(
                                        "grid size-6 shrink-0 place-items-center rounded-[0.25rem] border font-mono text-[10px] uppercase",
                                        answered && isAnswer
                                            ? "border-success text-success"
                                            : answered && isPicked
                                                ? "border-danger text-danger"
                                                : "border-border text-muted",
                                    )}
                                >
                                    {letters[index] ?? index + 1}
                                </span>
                                <span className="font-semibold">{option}</span>
                                {answered && isAnswer ? (
                                    <Check className="ml-auto size-4" />
                                ) : null}
                                {answered && isPicked && !isAnswer ? (
                                    <X className="ml-auto size-4" />
                                ) : null}
                            </button>
                        </li>
                    );
                })}
            </ul>

            {answered ? (
                <div className="animate-rise space-y-3">
                    <p
                        className={cn(
                            "text-sm font-semibold",
                            isCorrect ? "text-success" : "text-danger",
                        )}
                    >
                        {isCorrect ? t("correct") : t("wrong")}
                        {isCorrect ? null : ` · ${t("answerWas", { answer: correct })}`}
                    </p>
                    {card.exampleDe ? (
                        <p className="border-l-2 border-border pl-3 text-xs italic text-muted">
                            „{card.exampleDe}“
                        </p>
                    ) : null}
                    <Button className="w-full" onClick={onNext} loading={busy}>
                        {t("next")}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
