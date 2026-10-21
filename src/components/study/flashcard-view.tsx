"use client";

import { useTranslations } from "next-intl";
import { CornerDownRight, Repeat2 } from "lucide-react";
import type { Card } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { TtsButton } from "./tts-button";

export function FlashcardView({
    card,
    revealed,
    onReveal,
    onRepeat,
    onNext,
    busy,
    voiceURI,
    rate,
    lang,
    badgeLabel,
    repeatCount = 0,
    cycle,
}: {
    card: Card;
    revealed: boolean;
    onReveal: () => void;
    onRepeat: () => void;
    onNext: () => void;
    busy: boolean;
    voiceURI?: string | null;
    rate?: number;
    /** Speech locale of the active course (`de-DE` or `zh-TW`). */
    lang?: string;
    /** Replaces the section badge text (e.g. "Buku 1"). */
    badgeLabel?: string;
    repeatCount?: number;
    cycle?: number;
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
                    {repeatCount > 0 ? (
                        <Badge tone="warning">
                            <Repeat2 className="size-3" /> {repeatCount}
                        </Badge>
                    ) : null}
                    <Badge tone="neutral">{badgeLabel ?? card.level}</Badge>
                    {cycle ? <Badge tone="accent">{t("cycleBadge", { cycle })}</Badge> : null}
                </div>

                <div className="mt-6 flex items-center gap-2">
                    <h2
                        className={cn(
                            "font-extrabold tracking-tight",
                            card.script === "hanzi"
                                ? "font-cjk text-5xl leading-tight sm:text-6xl"
                                : "text-3xl sm:text-4xl",
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

                {card.ipa ? (
                    <p className="mt-1 font-mono text-xs text-muted">{card.ipa}</p>
                ) : null}

                {revealed ? (
                    <div className="animate-rise mt-6 w-full max-w-md">
                        <div className="mx-auto mb-5 h-px w-24 bg-border" />
                        {card.pinyin ? (
                            <p className="mb-2 font-mono text-lg font-semibold tracking-wide text-accent">
                                {card.pinyin}
                            </p>
                        ) : null}
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
                        {t("tapToReveal")} ·{" "}
                        <kbd className="rounded bg-surface-2 px-1.5 py-0.5">Space</kbd>
                    </p>
                )}
            </div>

            {revealed ? (
                <div className="grid gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={onRepeat}
                        disabled={busy}
                        className="flex flex-col items-start gap-0.5 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-left transition hover:bg-warning/15 disabled:opacity-50"
                    >
                        <span className="flex items-center gap-1.5 text-sm font-bold text-warning">
                            <Repeat2 className="size-4" />
                            {t("actionRepeat")}
                            <kbd className="ml-1 rounded bg-surface px-1 text-[10px] text-muted">1</kbd>
                        </span>
                        <span className="text-[11px] text-muted">{t("actionRepeatHint")}</span>
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        disabled={busy}
                        className="flex flex-col items-start gap-0.5 rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-left transition hover:bg-success/15 disabled:opacity-50"
                    >
                        <span className="flex items-center gap-1.5 text-sm font-bold text-success">
                            {t("actionNext")}
                            <kbd className="ml-1 rounded bg-surface px-1 text-[10px] text-muted">2</kbd>
                        </span>
                        <span className="text-[11px] text-muted">{t("actionNextHint")}</span>
                    </button>
                </div>
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
