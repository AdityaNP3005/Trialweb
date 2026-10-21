"use client";

import { useTranslations } from "next-intl";
import { CornerDownRight, Repeat2 } from "lucide-react";
import type { Card } from "@/types";
import { cn } from "@/lib/utils/cn";
import { TtsButton } from "./tts-button";

/**
 * The study card as a boarding pass: header strip, the word itself, a tear
 * line, then the stub with pronunciation, meaning and example. The card never
 * changes height on reveal, so nothing jumps under the reader's eye.
 */
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
        <div className="space-y-3">
            <div
                role="button"
                tabIndex={0}
                onClick={() => {
                    if (!revealed) onReveal();
                }}
                onKeyDown={(event) => {
                    if (!revealed && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        onReveal();
                    }
                }}
                aria-label={revealed ? card.front : t("tapToReveal")}
                className={cn(
                    "panel relative flex min-h-[19rem] cursor-pointer flex-col p-5 transition-colors sm:p-6",
                    !revealed && "hover:border-fg/30",
                )}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="eyebrow">{badgeLabel ?? card.level}</span>
                        {cycle ? (
                            <span className="meta text-accent">
                                · {t("cycleBadge", { cycle })}
                            </span>
                        ) : null}
                    </div>
                    {repeatCount > 0 ? (
                        <span className="stamp text-warning">
                            <Repeat2 className="size-3" /> {repeatCount}
                        </span>
                    ) : null}
                </div>

                <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                    <div className="flex items-center justify-center gap-3">
                        <p
                            className={cn(
                                "tracking-tight",
                                card.script === "hanzi"
                                    ? "font-cjk text-[3.5rem] leading-[1.05] sm:text-[4.25rem]"
                                    : "display text-[2.25rem] leading-[1.05] sm:text-[2.75rem]",
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
                    {card.ipa ? <p className="meta mt-3">{card.ipa}</p> : null}
                </div>

                <div className="tear -mx-5 sm:-mx-6" />

                <div className="min-h-[6.5rem] pt-1">
                    {revealed ? (
                        <div className="animate-rise space-y-2 text-center">
                            {card.pinyin ? (
                                <p className="font-mono text-lg font-medium tracking-wide text-accent">
                                    {card.pinyin}
                                </p>
                            ) : null}
                            <p className="text-lg font-semibold leading-snug">
                                {card.meaningId}
                                <span className="font-normal text-muted">
                                    {" "}
                                    · {card.meaningEn}
                                </span>
                            </p>

                            {card.plural ? (
                                <p className="meta">
                                    {t("pluralShort")} · {card.plural}
                                </p>
                            ) : null}

                            {card.exampleDe ? (
                                <div className="mt-3 border-l-2 border-border pl-3 text-left">
                                    <p className="flex items-start gap-1.5 text-sm italic leading-relaxed">
                                        <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-muted" />
                                        „{card.exampleDe}“
                                    </p>
                                    {card.exampleId ? (
                                        <p className="mt-1 pl-5 text-xs text-muted">
                                            {card.exampleId}
                                        </p>
                                    ) : null}
                                    {card.exampleEn ? (
                                        <p className="mt-0.5 pl-5 text-xs text-muted">
                                            {card.exampleEn}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <p className="flex items-center justify-center gap-2 pt-4 text-xs text-muted">
                            {t("tapToReveal")}
                            <span className="keycap">Space</span>
                        </p>
                    )}
                </div>
            </div>

            {revealed ? (
                <div className="grid gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={onRepeat}
                        disabled={busy}
                        className="flex flex-col items-start gap-0.5 rounded-[0.375rem] border border-warning/45 px-4 py-3 text-left transition-colors hover:bg-warning/10 disabled:opacity-50"
                    >
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                            <Repeat2 className="size-4" />
                            {t("actionRepeat")}
                            <span className="keycap ml-1">1</span>
                        </span>
                        <span className="text-[11px] leading-relaxed text-muted">
                            {t("actionRepeatHint")}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        disabled={busy}
                        className="flex flex-col items-start gap-0.5 rounded-[0.375rem] border border-fg bg-fg px-4 py-3 text-left text-bg transition-colors hover:bg-fg/90 disabled:opacity-50"
                    >
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                            {t("actionNext")}
                            <span className="keycap ml-1 border-bg/30 bg-transparent text-bg/80">
                                2
                            </span>
                        </span>
                        <span className="text-[11px] leading-relaxed text-bg/70">
                            {t("actionNextHint")}
                        </span>
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={onReveal}
                    className="w-full rounded-[0.375rem] border border-border py-3 text-sm font-semibold text-muted transition-colors hover:border-fg/40 hover:text-fg"
                >
                    {t("showAnswer")}
                </button>
            )}
        </div>
    );
}
