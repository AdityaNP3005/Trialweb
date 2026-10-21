"use client";

import { Volume2 } from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils/cn";

export function TtsButton({
    text,
    voiceURI,
    rate,
    lang,
    className,
}: {
    text: string;
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
                speak(text, { voiceURI: voiceURI ?? null, rate });
            }}
            aria-label="Play pronunciation"
            title="Play pronunciation"
            className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors hover:border-fg/40 hover:text-fg",
                className,
            )}
        >
            <Volume2 className="size-3.5" />
        </button>
    );
}
