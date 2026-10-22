"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CEFR_LEVELS } from "@/types";
import { schreibenSets } from "@/lib/writing/schreiben-sets";
import { SectionHeading } from "@/components/ui/page-header";

/** Goethe-style writing tasks grouped by band. */
export function SchreibenList() {
    const t = useTranslations("writing.de");

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted">{t("schreibenIntro")}</p>
            {CEFR_LEVELS.map((level) => {
                const sets = schreibenSets.filter((set) => set.level === level);
                if (sets.length === 0) return null;
                return (
                    <section key={level} className="space-y-2">
                        <SectionHeading>{level}</SectionHeading>
                        <ul className="border-t border-border">
                            {sets.map((set) => {
                                const minutes = set.parts.reduce((sum, part) => sum + part.minutes, 0);
                                return (
                                    <li key={set.id} className="border-b border-border">
                                        <Link
                                            href={`/writing/schreiben/${set.id}`}
                                            className="flex items-center gap-3 py-3 text-sm transition-colors hover:bg-surface-2/50"
                                        >
                                            <span className="flex-1">
                                                <span className="font-semibold">{set.title}</span>
                                                <span className="meta block">
                                                    {t("parts", { count: set.parts.length })} · {t("minutes", { count: minutes })}
                                                </span>
                                            </span>
                                            <ChevronRight className="size-4 text-muted" />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}
