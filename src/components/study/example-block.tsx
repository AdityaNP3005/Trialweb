import { CornerDownRight } from "lucide-react";
import type { Card } from "@/types";

/** Example sentence with its translations; Hanzi sentences also show pinyin. */
export function ExampleBlock({ card }: { card: Card }) {
    if (!card.exampleDe) return null;
    const hanzi = card.script === "hanzi";

    return (
        <div className="mt-3 border-l-2 border-border pl-3 text-left">
            <p
                className={
                    hanzi
                        ? "flex items-start gap-1.5 font-cjk text-base leading-relaxed"
                        : "flex items-start gap-1.5 text-sm italic leading-relaxed"
                }
            >
                <CornerDownRight className="mt-1 size-3.5 shrink-0 text-muted" />
                {hanzi ? card.exampleDe : `„${card.exampleDe}“`}
            </p>
            {card.examplePinyin ? (
                <p className="mt-0.5 pl-5 font-mono text-xs text-muted">{card.examplePinyin}</p>
            ) : null}
            {card.exampleId ? <p className="mt-1 pl-5 text-xs text-muted">{card.exampleId}</p> : null}
            {card.exampleEn ? <p className="mt-0.5 pl-5 text-xs text-muted">{card.exampleEn}</p> : null}
        </div>
    );
}
