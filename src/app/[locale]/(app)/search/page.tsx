"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Card } from "@/types";
import { getCourse } from "@/content/courses";
import { getContentDeck, loadContentCards, sectionsForCourse, unitsForSection } from "@/lib/content/registry";
import { sectionLabelFor, unitLabelFor } from "@/lib/content/labels";
import { searchCards } from "@/lib/content/search";
import { useStore } from "@/components/providers/store-provider";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/progress";
import { FrontText } from "@/components/study/front-text";
import { TonePinyin } from "@/components/study/tone-text";
import { TtsButton } from "@/components/study/tts-button";
import { spokenFront } from "@/lib/content/german";

/**
 * Word lookup across every bundled card of the active course: the word,
 * pinyin, or its Indonesian/English meaning. Each hit links to its topic.
 * shortcut: custom decks are not searched; add them via `store.listCards`
 * if users ask for it.
 */
export default function SearchPage() {
    const t = useTranslations("search");
    const tc = useTranslations("common");
    const locale = useLocale();
    const { profile } = useStore();
    const course = getCourse(profile?.activeCourseId);
    const [cards, setCards] = useState<Card[] | null>(null);
    const [query, setQuery] = useState("");
    const deferredQuery = useDeferredValue(query);

    useEffect(() => {
        let cancelled = false;
        setCards(null);
        const units = sectionsForCourse(course.id).flatMap((section) =>
            unitsForSection(course.id, section.id),
        );
        void Promise.all(units.map((unit) => loadContentCards(unit.id))).then((lists) => {
            if (!cancelled) setCards(lists.flat());
        });
        return () => {
            cancelled = true;
        };
    }, [course.id]);

    const results = useMemo(() => (cards ? searchCards(cards, deferredQuery) : []), [cards, deferredQuery]);
    const voiceURI = profile?.ttsVoices?.[course.id] ?? profile?.ttsVoiceURI;

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow={course.nativeName}
                title={t("title")}
                description={t("subtitle", { count: cards?.length ?? 0 })}
            />

            <label className="flex items-center gap-3 border-b-2 border-fg pb-2 focus-within:border-accent">
                <Search className="size-5 shrink-0 text-muted" aria-hidden />
                <input
                    type="search"
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={course.script === "hanzi" ? t("placeholderZh") : t("placeholderDe")}
                    aria-label={tc("search")}
                    className="w-full bg-transparent text-lg outline-none placeholder:text-muted/70"
                />
            </label>

            {!cards ? (
                <div className="space-y-2">
                    <Skeleton className="h-14" />
                    <Skeleton className="h-14" />
                    <Skeleton className="h-14" />
                </div>
            ) : !deferredQuery.trim() ? (
                <p className="text-sm text-muted">{t("hint")}</p>
            ) : results.length === 0 ? (
                <EmptyState title={t("noResults", { query: deferredQuery })} body={t("noResultsHint")} />
            ) : (
                <div className="space-y-2">
                    <p className="meta">{t("resultCount", { count: results.length })}</p>
                    <ul className="border-t border-border">
                        {results.map((card) => {
                            const unit = getContentDeck(card.deckId);
                            return (
                                <li key={card.id} className="flex items-center gap-3 border-b border-border py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-baseline gap-x-2">
                                            <span
                                                className={
                                                    card.script === "hanzi"
                                                        ? "font-cjk text-xl font-medium"
                                                        : "text-base font-semibold"
                                                }
                                            >
                                                <FrontText card={card} />
                                            </span>
                                            {card.pinyin ? (
                                                <span className="font-mono text-sm">
                                                    <TonePinyin card={card} />
                                                </span>
                                            ) : null}
                                        </p>
                                        <p className="truncate text-sm text-muted">
                                            {card.meaningId}
                                            {card.meaningEn ? ` · ${card.meaningEn}` : ""}
                                        </p>
                                    </div>
                                    <TtsButton
                                        text={spokenFront(card)}
                                        voiceURI={voiceURI}
                                        rate={profile?.ttsRate}
                                        lang={course.speechLocale}
                                    />
                                    {unit ? (
                                        <Link
                                            href={`/study/${unit.id}`}
                                            title={t("openTopic")}
                                            className="flex max-w-[45%] shrink-0 items-center gap-1 text-right text-xs text-muted transition-colors hover:text-fg sm:max-w-[16rem]"
                                        >
                                            <span className="truncate">
                                                <span className="font-mono">
                                                    {sectionLabelFor(unit.sectionId, course.unitNoun, tc)}
                                                </span>
                                                {" · "}
                                                {unitLabelFor(unit.order, unit.title, course.unitNoun, tc, locale)}
                                            </span>
                                            <ChevronRight className="size-3.5 shrink-0" />
                                        </Link>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
