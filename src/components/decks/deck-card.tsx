"use client";

import { ArrowRight, BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Deck } from "@/types";
import { Badge } from "@/components/ui/badge";

const sourceTone = {
    seed: "accent",
    user: "neutral",
} as const;

export function DeckCard({ deck }: { deck: Deck }) {
    const t = useTranslations("decks");

    return (
        <Link
            href={`/decks/${deck.id}`}
            className="surface-card group flex flex-col gap-3 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-accent/50"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
                        <BookOpen className="size-4" />
                    </span>
                    <div>
                        <h3 className="text-sm font-bold leading-tight">{deck.name}</h3>
                        <p className="mt-0.5 text-xs text-muted">
                            {t("cardCount", { count: deck.cardCount })}
                        </p>
                    </div>
                </div>
                <Badge tone={sourceTone[deck.source]}>{deck.level}</Badge>
            </div>

            {deck.description ? (
                <p className="line-clamp-2 text-xs leading-relaxed text-muted">
                    {deck.description}
                </p>
            ) : null}

            <div className="mt-auto flex items-center justify-between pt-1">
                <div className="flex flex-wrap gap-1">
                    {deck.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
                <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" />
            </div>
        </Link>
    );
}
