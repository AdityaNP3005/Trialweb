"use client";

import { Snail, Volume2 } from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils/cn";

export function TtsButton({
    text,
    voiceURI,
    rate,
    lang,
    slow = false,
    className,
}: {
    text: string;
    /** Plays at 60% of the chosen rate, to follow the syllables of the reading. */
    slow?: boolean;
    voiceURI?: string | null;
    rate?: number;
    lang?: string;
    className?: string;
}) {
    const { speak, supported } = useSpeech(lang);

    if (!supported) return null;

    return (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                speak(text, { voiceURI: voiceURI ?? null, rate: (rate ?? 1) * (slow ? 0.6 : 1) });
            }}
            aria-label={slow ? "Play pronunciation slowly" : "Play pronunciation"}
            title={slow ? "Play pronunciation slowly" : "Play pronunciation"}
            className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors hover:border-fg/40 hover:text-fg",
                className,
            )}
        >
            {slow ? <Snail className="size-3.5" /> : <Volume2 className="size-3.5" />}
        </button>
    );
}
