"use client";

import { useTranslations } from "next-intl";
import { CornerDownRight } from "lucide-react";
import type { Card, ReviewRating } from "@/types";
import type { IntervalPreview } from "@/lib/srs/fsrs";
import { Badge } from "@/components/ui/badge";
import { RatingBar } from "./rating-bar";
import { TtsButton } from "./tts-button";

export function FlashcardView({
    card,
    revealed,
    onReveal,
    preview,
    onRate,
    busy,
    voiceURI,
    rate,
}: {
    card: Card;
    revealed: boolean;
    onReveal: () => void;
    preview: IntervalPreview;
    onRate: (rating: ReviewRating) => void;
    busy: boolean;
    voiceURI?: string | null;
    rate?: number;
}) {
    const t = useTranslations("study");

    return (
        <div className="space-y-4">
            <div
                className="surface-card relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center overflow-hidden p-6 text-center transition hover:border-accent/30"
                onClick={() => {
                    if (!revealed) onReveal();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                    if (!revealed && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        onReveal();
                    }
                }}
                aria-label={revealed ? card.front : t("tapToReveal")}
            >
                <div className="flex items-center gap-2">
                    {card.isNew ? <Badge tone="accent">new</Badge> : null}
                    <Badge tone="neutral">{card.level}</Badge>
                </div>

                <div className="mt-6 flex items-center gap-2">
                    <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                        {card.front}
                    </h2>
                    <TtsButton text={card.front} voiceURI={voiceURI} rate={rate} />
                </div>

                {card.ipa ? (
                    <p className="mt-1 font-mono text-xs text-muted">{card.ipa}</p>
                ) : null}

                {revealed ? (
                    <div className="animate-rise mt-6 w-full max-w-md">
                        <div className="mx-auto mb-5 h-px w-24 bg-border" />
                        <p className="text-lg font-semibold">
                            {card.meaningId}
                            <span className="font-normal text-muted"> · {card.meaningEn}</span>
                        </p>

                        {card.plural ? (
                            <p className="mt-1 text-xs text-muted">Plural: {card.plural}</p>
                        ) : null}

                        {card.exampleDe ? (
                            <div className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-left">
                                <p className="flex items-start gap-1.5 text-sm italic">
                                    <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-muted" />
                                    „{card.exampleDe}“
                                </p>
                                {card.exampleId ? (
                                    <p className="mt-1 pl-5 text-xs text-muted">{card.exampleId}</p>
                                ) : null}
                                {card.exampleEn ? (
                                    <p className="mt-0.5 pl-5 text-xs text-muted">{card.exampleEn}</p>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <p className="mt-8 text-xs font-medium text-muted">
                        {t("tapToReveal")} · <kbd className="rounded bg-surface-2 px-1.5 py-0.5">Space</kbd>
                    </p>
                )}
            </div>

            {revealed ? (
                <RatingBar preview={preview} onRate={onRate} disabled={busy} />
            ) : (
                <button
                    type="button"
                    onClick={onReveal}
                    className="w-full rounded-xl border border-border bg-surface py-3 text-sm font-semibold text-muted transition hover:border-accent/40 hover:text-fg"
                >
                    {t("showAnswer")}
                </button>
            )}
        </div>
    );
}
