"use client";

import { useState } from "react";
import { Check, Mic, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Card } from "@/types";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { gradeSpeech, type SpeechVerdict } from "@/lib/study/speech-match";
import { cn } from "@/lib/utils/cn";

const verdictTone: Record<SpeechVerdict, string> = {
    match: "text-success",
    close: "text-warning",
    miss: "text-danger",
};

/**
 * Pronunciation check: the learner says the word, the browser transcribes it
 * and the transcript is compared with the card. Hidden where the browser has
 * no speech recognition (e.g. Firefox). Mount with `key={card.id}`.
 */
export function SpeakCheck({ card, lang }: { card: Card; lang: string }) {
    const t = useTranslations("study");
    const { supported, listening, error, listen } = useSpeechRecognition(lang);
    const [result, setResult] = useState<{ verdict: SpeechVerdict; best: string } | null>(null);

    if (!supported) return null;

    async function check() {
        setResult(null);
        const heard = await listen();
        if (heard.length > 0) setResult(gradeSpeech(heard, card));
    }

    return (
        <div className="mt-3 flex min-h-7 flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    if (!listening) void check();
                }}
                onKeyDown={(event) => event.stopPropagation()}
                aria-pressed={listening}
                className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] transition-colors",
                    listening
                        ? "animate-pulse border-accent text-accent"
                        : "border-border text-muted hover:border-fg/40 hover:text-fg",
                )}
            >
                <Mic className="size-3.5" />
                {listening ? t("speakListening") : t("speakButton")}
            </button>

            <p aria-live="polite" className="text-xs">
                {error ? (
                    <span className="text-danger">
                        {error === "not-allowed" ? t("speakBlocked") : t("speakFailed")}
                    </span>
                ) : result ? (
                    <span className={cn("inline-flex items-center gap-1", verdictTone[result.verdict])}>
                        {result.verdict === "miss" ? <X className="size-3.5" /> : <Check className="size-3.5" />}
                        <span className="font-semibold">
                            {t(`speak_${result.verdict}`)}
                        </span>
                        <span className="text-muted">· “{result.best}”</span>
                    </span>
                ) : null}
            </p>
        </div>
    );
}
