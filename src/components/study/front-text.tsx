import { frontParts } from "@/lib/content/german";
import type { Card, Gender } from "@/types";

const ARTICLE_COLOR: Record<Gender, string> = {
    der: "text-der",
    die: "text-die",
    das: "text-das",
};

/** Card front with the German article coloured by gender (der/die/das). */
export function FrontText({ card }: { card: Pick<Card, "front" | "gender"> }) {
    const { article, word } = frontParts(card);
    if (!article) return <>{card.front}</>;
    return (
        <>
            <span className={ARTICLE_COLOR[article]}>{article}</span> {word}
        </>
    );
}
