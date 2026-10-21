"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Card } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { TtsButton } from "./tts-button";

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
            <div className="surface-card flex min-h-[180px] flex-col items-center justify-center p-6 text-center">
                <div className="flex items-center gap-2">
                    <Badge tone="neutral">{badgeLabel ?? card.level}</Badge>
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <h2
                        className={cn(
                            "font-extrabold tracking-tight",
                            card.script === "hanzi"
                                ? "font-cjk text-4xl sm:text-5xl"
                                : "text-3xl",
                        )}
                    >
                        {card.front}
                    </h2>
                    <TtsButton
                        text={card.front}
                        voiceURI={voiceURI}
                        rate={rate}
                        lang={lang}
                    />
                </div>
                <p className="mt-2 text-xs text-muted">{t("question")}</p>
            </div>

            <div className="grid gap-2">
                {options.map((option) => {
                    const isAnswer = option === correct;
                    const isPicked = option === picked;

                    return (
                        <button
                            key={option}
                            type="button"
                            disabled={answered || busy}
                            onClick={() => onPick(option)}
                            className={cn(
                                "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition",
                                !answered && "border-border bg-surface hover:border-accent/50 hover:bg-surface-2",
                                answered && isAnswer && "border-success/40 bg-success/10 text-success",
                                answered &&
                                isPicked &&
                                !isAnswer &&
                                "border-danger/40 bg-danger/10 text-danger",
                                answered && !isAnswer && !isPicked && "border-border bg-surface opacity-60",
                            )}
                        >
                            {option}
                            {answered && isAnswer ? <Check className="size-4" /> : null}
                            {answered && isPicked && !isAnswer ? <X className="size-4" /> : null}
                        </button>
                    );
                })}
            </div>

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
                        <p className="text-xs italic text-muted">„{card.exampleDe}“</p>
                    ) : null}
                    <Button className="w-full" onClick={onNext} loading={busy}>
                        {t("next")}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
