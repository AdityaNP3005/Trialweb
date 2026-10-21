"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type SpeakOptions = {
    voiceURI?: string | null;
    rate?: number;
    /** Overrides the locale passed to the hook (e.g. a mixed-content deck). */
    locale?: string | null;
};

function primary(locale: string): string {
    return locale.toLowerCase().split(/[-_]/)[0];
}

/**
 * Browser speech synthesis, filtered by locale. German uses `de-DE`, Mandarin
 * uses `zh-TW`. Voices are provided by the operating system, so nothing has to
 * be hosted and no copyrighted textbook audio is used.
 */
export function useSpeech(locale = "de-DE") {
    const [supported, setSupported] = useState(false);
    const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

        setSupported(true);
        const synth = window.speechSynthesis;
        const load = () => setAllVoices(synth.getVoices());

        load();
        synth.addEventListener("voiceschanged", load);
        return () => synth.removeEventListener("voiceschanged", load);
    }, []);

    const voices = useMemo(() => {
        const wanted = locale.toLowerCase();
        const tag = primary(locale);
        return allVoices
            .filter((voice) => primary(voice.lang) === tag)
            .sort((a, b) => {
                const aExact = a.lang.toLowerCase() === wanted ? 0 : 1;
                const bExact = b.lang.toLowerCase() === wanted ? 0 : 1;
                if (aExact !== bExact) return aExact - bExact;
                return a.name.localeCompare(b.name);
            });
    }, [allVoices, locale]);

    const speak = useCallback(
        (text: string, options: SpeakOptions = {}) => {
            if (!supported || !text.trim()) return;
            const synth = window.speechSynthesis;
            synth.cancel();

            const target = options.locale ?? locale;
            const pool = allVoices.filter(
                (voice) => primary(voice.lang) === primary(target),
            );
            const utterance = new SpeechSynthesisUtterance(text);
            const voice =
                pool.find((entry) => entry.voiceURI === options.voiceURI) ??
                pool.find((entry) => entry.lang.toLowerCase() === target.toLowerCase()) ??
                pool[0];

            if (voice) utterance.voice = voice;
            utterance.lang = voice?.lang ?? target;
            utterance.rate = options.rate ?? 1;

            synth.speak(utterance);
        },
        [supported, allVoices, locale],
    );

    return { supported, voices, allVoices, speak };
}
