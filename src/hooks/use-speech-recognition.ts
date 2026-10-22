"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** The part of the Web Speech recognition API used here (Chrome/Edge/Safari). */
type Recognition = {
    lang: string;
    maxAlternatives: number;
    interimResults: boolean;
    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    abort: () => void;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
    if (typeof window === "undefined") return null;
    const scope = window as unknown as Record<string, RecognitionCtor | undefined>;
    return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/**
 * One-shot browser speech recognition. The browser sends the audio to its own
 * speech service; nothing is stored by the app. `error` is the browser's code,
 * e.g. "not-allowed" when the microphone is blocked.
 */
export function useSpeechRecognition(lang: string) {
    const [supported, setSupported] = useState(false);
    const [listening, setListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const active = useRef<Recognition | null>(null);

    useEffect(() => {
        setSupported(recognitionCtor() !== null);
        return () => active.current?.abort();
    }, []);

    /** Resolves with the heard alternatives, or [] when nothing was understood. */
    const listen = useCallback((): Promise<string[]> => {
        const Ctor = recognitionCtor();
        if (!Ctor) return Promise.resolve([]);
        active.current?.abort();

        return new Promise((resolve) => {
            const recognition = new Ctor();
            let heard: string[] = [];
            recognition.lang = lang;
            recognition.maxAlternatives = 5;
            recognition.interimResults = false;
            recognition.onresult = (event) => {
                heard = Array.from(event.results[0] ?? [], (entry) => entry.transcript);
            };
            recognition.onerror = (event) => {
                if (event.error !== "no-speech" && event.error !== "aborted") setError(event.error);
            };
            recognition.onend = () => {
                active.current = null;
                setListening(false);
                resolve(heard);
            };
            active.current = recognition;
            setError(null);
            setListening(true);
            recognition.start();
        });
    }, [lang]);

    return { supported, listening, error, listen };
}
