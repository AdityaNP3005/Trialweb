"use client";

import { Volume2 } from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils/cn";

export function TtsButton({
    text,
    voiceURI,
    rate,
    className,
    label = "Play pronunciation",
}: {
    text: string;
    voiceURI?: string | null;
    rate?: number;
    className?: string;
    label?: string;
}) {
    const { supported, speak } = useSpeech();

    if (!supported) return null;

    return (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                speak(text, { voiceURI, rate });
            }}
            title={label}
            aria-label={label}
            className={cn(
                "inline-grid size-9 place-items-center rounded-full bg-surface-2 text-muted transition hover:bg-accent-soft hover:text-accent",
                className,
            )}
        >
            <Volume2 className="size-4" />
        </button>
    );
}
