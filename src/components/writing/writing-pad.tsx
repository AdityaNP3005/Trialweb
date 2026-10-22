"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type HanziWriter from "hanzi-writer";
import { Eye, EyeOff, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const SIZE = 260;

/** Hanzi Writer needs plain colour strings, not the oklch theme tokens. */
function palette() {
    const dark = document.documentElement.classList.contains("dark");
    return dark
        ? { strokeColor: "#ece8df", outlineColor: "#3d4350", drawingColor: "#e0795c", highlightColor: "#6fb08a", radicalColor: "#d9a441" }
        : { strokeColor: "#2c2620", outlineColor: "#ddd5c6", drawingColor: "#b5432a", highlightColor: "#2f7a52", radicalColor: "#a9781f" };
}

/**
 * Tracing practice for one character: writing starts as soon as the stroke data
 * loads. "Show stroke order" animates only the strokes not written yet, then
 * writing resumes from that stroke. Stroke data comes from hanzi-writer-data
 * on jsDelivr.
 */
export function WritingPad({ char, onComplete }: { char: string; onComplete?: () => void }) {
    const t = useTranslations("writing");
    const target = useRef<HTMLDivElement>(null);
    const writer = useRef<HanziWriter | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
    const [outline, setOutline] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [animating, setAnimating] = useState(false);
    // Index of the first stroke the learner has not written yet.
    const nextStroke = useRef(0);
    const strokeCount = useRef(0);

    function practice(fromStroke: number) {
        nextStroke.current = fromStroke;
        void writer.current?.quiz({
            quizStartStrokeNum: fromStroke,
            showHintAfterMisses: 3,
            onMistake: () => setMessage(t("mistakeHint")),
            onCorrectStroke: ({ strokeNum }) => {
                nextStroke.current = strokeNum + 1;
                setMessage(null);
            },
            onComplete: ({ totalMistakes }) => {
                nextStroke.current = strokeCount.current;
                setMessage(t("done", { mistakes: totalMistakes }));
                onComplete?.();
            },
        });
    }
    // The load callback runs later; it must call the latest `practice`.
    const practiceRef = useRef(practice);
    useEffect(() => {
        practiceRef.current = practice;
    });

    useEffect(() => {
        let cancelled = false;
        setStatus("loading");
        setMessage(null);
        setOutline(true);
        setAnimating(false);
        nextStroke.current = 0;
        (async () => {
            const { default: Writer } = await import("hanzi-writer");
            if (cancelled || !target.current) return;
            target.current.innerHTML = "";
            writer.current = Writer.create(target.current, char, {
                width: SIZE,
                height: SIZE,
                padding: 12,
                showOutline: true,
                showCharacter: false,
                strokeAnimationSpeed: 1,
                delayBetweenStrokes: 250,
                ...palette(),
                onLoadCharDataSuccess: (data) => {
                    if (cancelled) return;
                    strokeCount.current = data.strokes.length;
                    setStatus("ready");
                    // Writing is the default; the quiz needs `writer.current`, set below.
                    setTimeout(() => {
                        if (!cancelled) practiceRef.current(0);
                    });
                },
                onLoadCharDataError: () => {
                    if (!cancelled) setStatus("missing");
                },
            });
        })();
        return () => {
            cancelled = true;
            writer.current?.cancelQuiz();
            writer.current = null;
        };
    }, [char]);

    /** Animates the strokes still to write, then resumes writing at the same stroke. */
    async function showRemainingStrokes() {
        const current = writer.current;
        if (!current || animating) return;
        setMessage(null);
        setAnimating(true);
        // A finished character replays from the start and is written again.
        const from = nextStroke.current >= strokeCount.current ? 0 : nextStroke.current;
        if (from === 0) await current.hideCharacter();
        for (let stroke = from; stroke < strokeCount.current; stroke += 1) {
            if (writer.current !== current) return; // moved to another character
            await current.animateStroke(stroke);
        }
        if (writer.current !== current) return;
        setAnimating(false);
        practice(from);
    }

    function toggleOutline() {
        if (outline) void writer.current?.hideOutline();
        else void writer.current?.showOutline();
        setOutline(!outline);
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative rounded-[0.375rem] border border-border bg-surface">
                {/* Rice-paper grid (米字格) to place strokes, like a writing book. */}
                <svg
                    width={SIZE}
                    height={SIZE}
                    className="pointer-events-none absolute inset-0 text-border"
                    aria-hidden
                >
                    <g stroke="currentColor" strokeDasharray="4 4" strokeWidth="1">
                        <line x1="0" y1={SIZE / 2} x2={SIZE} y2={SIZE / 2} />
                        <line x1={SIZE / 2} y1="0" x2={SIZE / 2} y2={SIZE} />
                        <line x1="0" y1="0" x2={SIZE} y2={SIZE} />
                        <line x1={SIZE} y1="0" x2="0" y2={SIZE} />
                    </g>
                </svg>
                <div ref={target} className="relative touch-none" style={{ width: SIZE, height: SIZE }} />
                {status === "missing" ? (
                    <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
                        {t("noData")}
                    </p>
                ) : null}
            </div>

            <div className="flex flex-wrap justify-center gap-2">
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void showRemainingStrokes()}
                    disabled={status !== "ready" || animating}
                >
                    <Play className="size-3.5" />
                    {t("animate")}
                </Button>
                <Button size="sm" variant="secondary" onClick={toggleOutline} disabled={status !== "ready"}>
                    {outline ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    {t("outline")}
                </Button>
            </div>

            <p className="min-h-5 text-center text-xs text-muted" aria-live="polite">
                {message}
            </p>
        </div>
    );
}
