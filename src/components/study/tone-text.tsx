import { hanziWithTones, toneOf } from "@/lib/content/pinyin";
import type { Card } from "@/types";

export const TONE_COLOR: Record<number, string> = {
    1: "text-tone-1",
    2: "text-tone-2",
    3: "text-tone-3",
    4: "text-tone-4",
    5: "text-tone-5",
};

/** Hanzi coloured by the tone of their syllable (1 red, 2 orange, 3 green, 4 blue). */
export function ToneHanzi({ card }: { card: Pick<Card, "front" | "pinyinParts"> }) {
    return (
        <>
            {hanziWithTones(card.front, card.pinyinParts).map(({ char, tone }, index) => (
                <span key={index} className={tone ? TONE_COLOR[tone] : undefined}>
                    {char}
                </span>
            ))}
        </>
    );
}

/** Pinyin coloured per syllable; falls back to the plain string. */
export function TonePinyin({ card }: { card: Pick<Card, "pinyin" | "pinyinParts"> }) {
    if (!card.pinyinParts?.length) return <>{card.pinyin}</>;
    return (
        <>
            {card.pinyinParts.map((syllable, index) => (
                <span key={index} className={TONE_COLOR[toneOf(syllable)]}>
                    {syllable}
                </span>
            ))}
        </>
    );
}
