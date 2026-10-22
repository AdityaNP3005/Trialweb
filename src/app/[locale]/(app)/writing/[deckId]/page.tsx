"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Card } from "@/types";
import { getCourse } from "@/content/courses";
import { getContentDeck, getSection, loadContentCards } from "@/lib/content/registry";
import { unitLabelFor } from "@/lib/content/labels";
import { toneOf } from "@/lib/content/pinyin";
import { practiceCharacters } from "@/lib/content/writing";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/progress";
import { TtsButton } from "@/components/study/tts-button";
import { TONE_COLOR } from "@/components/study/tone-text";
import { WritingPad } from "@/components/writing/writing-pad";
import { useStore } from "@/components/providers/store-provider";
import { useActiveCourse } from "@/hooks/use-active-course";

export default function WritingChapterPage() {
    const params = useParams<{ deckId: string }>();
    const deckId = params?.deckId ?? "";
    const t = useTranslations("writing");
    const tc = useTranslations("common");
    const locale = useLocale();
    const { profile } = useStore();
    const unit = getContentDeck(deckId);
    const course = getCourse("zh");
    useActiveCourse("zh");

    const [cards, setCards] = useState<Card[] | null>(null);
    const [index, setIndex] = useState(0);

    useEffect(() => {
        let cancelled = false;
        void loadContentCards(deckId).then((loaded) => {
            if (!cancelled) setCards(loaded);
        });
        return () => {
            cancelled = true;
        };
    }, [deckId]);

    const chars = useMemo(() => (cards ? practiceCharacters(cards) : []), [cards]);
    const current = chars[index];

    if (!unit || unit.courseId !== "zh") {
        return <EmptyState title={t("empty")} />;
    }

    const header = (
        <PageHeader
            eyebrow={`${getSection(unit.sectionId)?.label ?? ""} · ${t("title")}`}
            title={unitLabelFor(unit.order, unit.title, course.unitNoun, tc, locale)}
            meta={[{ label: t("characterLabel"), value: String(chars.length) }]}
            back={{ href: "/writing", label: t("back") }}
        />
    );

    if (!cards) {
        return (
            <div className="space-y-4">
                {header}
                <Skeleton className="h-80" />
            </div>
        );
    }

    if (!current) return <EmptyState title={t("empty")} />;

    return (
        <div className="mx-auto max-w-xl space-y-5">
            {header}

            <div className="flex items-center justify-between gap-3">
                <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                    <ChevronLeft className="size-3.5" />
                    {t("prev")}
                </Button>
                <span className="meta num">{t("position", { index: index + 1, total: chars.length })}</span>
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={index + 1 >= chars.length}
                    onClick={() => setIndex(index + 1)}
                >
                    {t("next")}
                    <ChevronRight className="size-3.5" />
                </Button>
            </div>

            <div className="panel space-y-4 p-5 text-center">
                <div className="flex items-center justify-center gap-3">
                    <span
                        className={`font-cjk text-5xl font-medium ${current.pinyin ? TONE_COLOR[toneOf(current.pinyin)] : ""}`}
                    >
                        {current.char}
                    </span>
                    <div className="text-left">
                        <p className="font-mono text-lg">{current.pinyin}</p>
                        <p className="text-sm text-muted">{current.meaning}</p>
                    </div>
                    <TtsButton
                        text={current.char}
                        lang={course.speechLocale}
                        voiceURI={profile?.ttsVoices?.zh ?? null}
                        rate={profile?.ttsRate}
                    />
                </div>

                <WritingPad char={current.char} />

                {current.words.length ? (
                    <p className="meta">
                        {t("usedIn")} · <span className="font-cjk">{current.words.join(" · ")}</span>
                    </p>
                ) : null}
            </div>

            <div className="flex flex-wrap justify-center gap-1">
                {chars.map((entry, position) => (
                    <button
                        key={entry.char}
                        type="button"
                        onClick={() => setIndex(position)}
                        aria-current={position === index}
                        className={`grid size-9 place-items-center rounded-[0.25rem] border font-cjk text-lg transition-colors ${
                            position === index ? "border-fg" : "border-border text-muted hover:border-fg/40"
                        }`}
                    >
                        {entry.char}
                    </button>
                ))}
            </div>
        </div>
    );
}
