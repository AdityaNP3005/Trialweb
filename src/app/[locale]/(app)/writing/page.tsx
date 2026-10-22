"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getCourse } from "@/content/courses";
import { loadContentCards, sectionsForCourse, unitsForSection } from "@/lib/content/registry";
import { practiceCharacters } from "@/lib/content/writing";
import { useStore } from "@/components/providers/store-provider";
import { unitLabelFor } from "@/lib/content/labels";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";

/**
 * Writing practice for the active course, separate from flashcard review: pick
 * a chapter and practise its characters stroke by stroke.
 * shortcut: only Hanzi courses have writing material; German shows an empty
 * state until its own writing content exists.
 */
export default function WritingIndexPage() {
    const t = useTranslations("writing");
    const tc = useTranslations("common");
    const locale = useLocale();
    const { store, profile } = useStore();
    const course = getCourse(profile?.activeCourseId);
    const hasMaterial = course.script === "hanzi";
    const sections = hasMaterial ? sectionsForCourse(course.id) : [];
    // Per chapter: [written, total] Hanzi, so unfinished chapters stand out.
    const [progress, setProgress] = useState<Record<string, [number, number]>>({});

    useEffect(() => {
        if (!store || !hasMaterial) return;
        let cancelled = false;
        (async () => {
            const written = new Set(await store.getWrittenCharacters(course.id));
            const units = sectionsForCourse(course.id).flatMap((section) =>
                unitsForSection(course.id, section.id),
            );
            const entries = await Promise.all(
                units.map(async (unit) => {
                    const chars = practiceCharacters(await loadContentCards(unit.id));
                    const done = chars.filter((entry) => written.has(entry.char)).length;
                    return [unit.id, [done, chars.length] as [number, number]] as const;
                }),
            );
            if (!cancelled) setProgress(Object.fromEntries(entries));
        })();
        return () => {
            cancelled = true;
        };
    }, [store, course.id, hasMaterial]);

    return (
        <div className="space-y-6">
            <PageHeader eyebrow={course.nativeName} title={t("title")} description={t("subtitle")} />

            {sections.length === 0 ? (
                <EmptyState
                    title={t("noMaterialTitle", { course: course.nativeName })}
                    body={t("noMaterialBody")}
                />
            ) : null}

            {sections.map((section) => (
                <section key={section.id} className="space-y-2">
                    <SectionHeading hint={section.title}>{section.label}</SectionHeading>
                    <ul className="border-t border-border">
                        {unitsForSection(course.id, section.id).map((unit) => {
                            const [done, total] = progress[unit.id] ?? [0, 0];
                            const finished = total > 0 && done === total;
                            return (
                            <li key={unit.id} className="border-b border-border">
                                <Link
                                    href={`/writing/${unit.id}`}
                                    className="flex items-center gap-3 py-3 text-sm transition-colors hover:bg-surface-2/50"
                                >
                                    <span className="num w-8 font-mono text-xs text-muted">{unit.icon}</span>
                                    <span className="flex-1 font-semibold">
                                        {unitLabelFor(unit.order, unit.title, course.unitNoun, tc, locale)}
                                    </span>
                                    {total > 0 ? (
                                        <span
                                            className={`meta num inline-flex items-center gap-1 ${finished ? "text-success" : done > 0 ? "text-fg" : ""}`}
                                        >
                                            {finished ? <CheckCircle2 className="size-3.5" /> : null}
                                            {t("progressValue", { done, total })}
                                        </span>
                                    ) : null}
                                    <ChevronRight className="size-4 text-muted" />
                                </Link>
                            </li>
                            );
                        })}
                    </ul>
                </section>
            ))}
        </div>
    );
}
