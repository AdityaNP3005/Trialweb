"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type SpeakOptions = {
    voiceURI?: string | null;
    rate?: number;
};

export function useSpeech() {
    const [supported, setSupported] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

        setSupported(true);
        const synth = window.speechSynthesis;
        const load = () => setVoices(synth.getVoices());

        load();
        synth.addEventListener("voiceschanged", load);
        return () => synth.removeEventListener("voiceschanged", load);
    }, []);

    const germanVoices = useMemo(
        () =>
            voices.filter((voice) => voice.lang.toLowerCase().startsWith("de")),
        [voices],
    );

    const speak = useCallback(
        (text: string, options: SpeakOptions = {}) => {
            if (!supported || !text.trim()) return;
            const synth = window.speechSynthesis;
            synth.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            const voice =
                germanVoices.find((entry) => entry.voiceURI === options.voiceURI) ??
                germanVoices[0];

            if (voice) utterance.voice = voice;
            utterance.lang = voice?.lang ?? "de-DE";
            utterance.rate = options.rate ?? 1;

            synth.speak(utterance);
        },
        [supported, germanVoices],
    );

    return { supported, germanVoices, speak };
}
