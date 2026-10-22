import { useTranslations } from "next-intl";
import type { Card } from "@/types";
import { toneOf } from "@/lib/content/pinyin";
import { TONE_COLOR } from "./tone-text";

/** Pinyin letters that Indonesian spelling would mislead (see docs/MANDARIN-ENRICHMENT.md). */
const PINYIN_HINTS: [string, string][] = [
    ["x", "≈ sy (xiè)"],
    ["q", "≈ c + hembusan (qī)"],
    ["j", "≈ c lembut, tanpa hembusan (jī)"],
    ["zh · ch · sh", "≈ j · c · sy dengan ujung lidah ditekuk ke atas"],
    ["z · c", "≈ ts tanpa · dengan hembusan"],
    ["r", "antara r dan j (rè)"],
    ["e", "≈ ê pepet (hē)"],
    ["ü", "≈ iu: lidah i, bibir u (lǜ)"],
    ["-ong · -ian", "≈ -ung · -yen"],
    ["b d g · p t k", "p t k lemah · p t k + hembusan"],
];

/** Back-of-card extras for Mandarin: measure words, characters, pinyin guide. */
export function ChineseDetails({ card }: { card: Card }) {
    const t = useTranslations("study");

    return (
        <div className="space-y-2 text-left">
            {card.measureWords ? (
                <p className="meta text-center">
                    {t("measureWords")} · <span className="font-cjk">{card.measureWords}</span>
                </p>
            ) : null}

            {card.characters?.length ? (
                <ul className="grid gap-1 border-t border-border pt-2 sm:grid-cols-2">
                    {card.characters.map((info, index) => (
                        <li key={`${info.char}-${index}`} className="flex items-baseline gap-2 text-xs">
                            <span
                                className={`font-cjk text-lg font-medium ${info.pinyin ? TONE_COLOR[toneOf(info.pinyin)] : ""}`}
                            >
                                {info.char}
                            </span>
                            <span className="min-w-0">
                                <span className="font-mono">{info.pinyin}</span>{" "}
                                <span className="text-muted">
                                    {[info.meaningId, info.meaningEn].filter(Boolean).join(" · ")}
                                </span>
                                {info.radical && info.radical !== info.char ? (
                                    <span className="meta">
                                        {" "}
                                        · {t("radical")} <span className="font-cjk">{info.radical}</span>
                                    </span>
                                ) : null}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : null}

            <details
                className="text-xs text-muted"
                onClick={(event) => event.stopPropagation()}
            >
                <summary className="cursor-pointer select-none">{t("pinyinGuide")}</summary>
                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                    {PINYIN_HINTS.map(([letters, hint]) => (
                        <div key={letters} className="contents">
                            <dt className="font-mono text-fg">{letters}</dt>
                            <dd>{hint}</dd>
                        </div>
                    ))}
                </dl>
            </details>
        </div>
    );
}
