"use client";

import { BookOpen, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Deck, DeckProgress } from "@/types";
import { getCourse } from "@/content/courses";
import { sectionLabelFor, unitLabelFor } from "@/lib/content/labels";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

/**
 * A pass card: route code in the rail, title and route progress in the body,
 * a tear line before the stub with tags and the call to action.
 */
export function DeckCard({
    deck,
    progress,
}: {
    deck: Deck;
    progress?: DeckProgress;
}) {
    const t = useTranslations("decks");
    const tc = useTranslations("common");
    const locale = useLocale();
    const course = getCourse(deck.courseId);
    const percent = progress?.percent ?? 0;

    return (
        <Link
            href={`/decks/${deck.id}`}
            className="panel group flex flex-col transition-colors hover:border-fg/35"
        >
            <div className="flex items-start justify-between gap-3 p-4 pb-3">
                <div className="min-w-0">
                    <p className="meta">
                        {sectionLabelFor(deck.level, course.unitNoun, tc)}
                    </p>
                    <h3 className="mt-1.5 truncate text-sm font-semibold leading-tight">
                        {unitLabelFor(deck.topicOrder, deck.name, course.unitNoun, tc, locale)}
                    </h3>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge tone={deck.readOnly ? "neutral" : "accent"}>
                        {deck.readOnly ? t("badgeContent") : t("badgeCustom")}
                    </Badge>
                    {deck.readOnly ? (
                        <Lock className="size-3 text-muted" aria-label="read-only" />
                    ) : (
                        <BookOpen className="size-3 text-muted" aria-hidden />
                    )}
                </div>
            </div>

            <div className="px-4">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="meta">
                        {t("cardCount", { count: deck.cardCount })}
                    </span>
                    <span className="num text-xs font-semibold">
                        {progress?.known ?? 0}/{deck.cardCount}
                    </span>
                </div>
                <Progress value={percent} className="mt-1.5" />
            </div>

            <div className="tear-flat mx-4" />

            <div className="mt-auto flex items-center justify-between gap-2 px-4 pb-4">
                <div className="flex flex-wrap gap-1">
                    {deck.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="meta normal-case tracking-normal">
                            #{tag}
                        </span>
                    ))}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
                    {t("cycleLabel", { cycle: progress?.cycle ?? 1 })}
                </span>
            </div>
        </Link>
    );
}
