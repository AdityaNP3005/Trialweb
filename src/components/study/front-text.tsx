import { frontParts } from "@/lib/content/german";
import type { Card, Gender } from "@/types";
import { ToneHanzi } from "./tone-text";

const ARTICLE_COLOR: Record<Gender, string> = {
    der: "text-der",
    die: "text-die",
    das: "text-das",
};

/** Card front: German article coloured by gender, Hanzi coloured by tone. */
export function FrontText({
    card,
}: {
    card: Pick<Card, "front" | "gender" | "script" | "pinyinParts">;
}) {
    if (card.script === "hanzi") return <ToneHanzi card={card} />;
    const { article, word } = frontParts(card);
    if (!article) return <>{card.front}</>;
    return (
        <>
            <span className={ARTICLE_COLOR[article]}>{article}</span> {word}
        </>
    );
}
