"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { SchreibenList } from "./schreiben-list";
import { SpellingPractice } from "./spelling-practice";

/** German writing: spelling drill and Goethe-style Schreiben tasks. */
export function GermanWriting() {
    const t = useTranslations("writing.de");
    const params = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    // Kept in the URL so "back" from a Schreiben task returns to this tab.
    const tab = params.get("tab") === "schreiben" ? "schreiben" : "spelling";

    return (
        <div className="space-y-5">
            <div className="flex gap-5 border-b border-border" role="tablist">
                {(["spelling", "schreiben"] as const).map((key) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={tab === key}
                        onClick={() => router.replace(key === "spelling" ? pathname : `${pathname}?tab=schreiben`)}
                        className={cn(
                            "-mb-px border-b-2 pb-2 text-sm font-semibold transition-colors",
                            tab === key ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
                        )}
                    >
                        {key === "spelling" ? t("tabSpelling") : t("tabSchreiben")}
                    </button>
                ))}
            </div>
            {tab === "spelling" ? <SpellingPractice /> : <SchreibenList />}
        </div>
    );
}
