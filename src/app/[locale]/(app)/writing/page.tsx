"use client";

import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getCourse } from "@/content/courses";
import { sectionsForCourse, unitsForSection } from "@/lib/content/registry";
import { unitLabelFor } from "@/lib/content/labels";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { useActiveCourse } from "@/hooks/use-active-course";

/**
 * Hanzi writing practice, separate from flashcard review: pick a chapter of
 * 當代中文課程 and practise its characters stroke by stroke.
 */
export default function WritingIndexPage() {
    const t = useTranslations("writing");
    const tc = useTranslations("common");
    const locale = useLocale();
    const course = getCourse("zh");
    const sections = sectionsForCourse("zh");
    useActiveCourse("zh");

    return (
        <div className="space-y-6">
            <PageHeader eyebrow={course.nativeName} title={t("title")} description={t("subtitle")} />

            {sections.length === 0 ? <EmptyState title={t("empty")} /> : null}

            {sections.map((section) => (
                <section key={section.id} className="space-y-2">
                    <SectionHeading hint={section.title}>{section.label}</SectionHeading>
                    <ul className="border-t border-border">
                        {unitsForSection("zh", section.id).map((unit) => (
                            <li key={unit.id} className="border-b border-border">
                                <Link
                                    href={`/writing/${unit.id}`}
                                    className="flex items-center gap-3 py-3 text-sm transition-colors hover:bg-surface-2/50"
                                >
                                    <span className="num w-8 font-mono text-xs text-muted">{unit.icon}</span>
                                    <span className="flex-1 font-semibold">
                                        {unitLabelFor(unit.order, unit.title, course.unitNoun, tc, locale)}
                                    </span>
                                    <ChevronRight className="size-4 text-muted" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}
