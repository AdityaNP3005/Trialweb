"use client";

import { useTranslations } from "next-intl";
import { courses } from "@/content/courses";
import { cn } from "@/lib/utils/cn";

/**
 * Language selector: in the header of every page (compact), and larger on the
 * dashboard and deck list. Reads as a set of
 * destination tabs: the native name in its own script, a hairline underline for
 * the active route, no pills.
 */
export function CourseSwitcher({
    activeCourseId,
    disabled = false,
    compact = false,
    onSelect,
}: {
    activeCourseId: string;
    disabled?: boolean;
    /** Header size: smaller text, no unit label. */
    compact?: boolean;
    onSelect: (courseId: string) => void | Promise<void>;
}) {
    const enabled = courses.filter((course) => course.enabled);
    const tc = useTranslations("common");

    return (
        <div className={cn("flex items-center", compact ? "gap-3" : "gap-5")} role="group" aria-label="Course">
            {enabled.map((course) => {
                const active = course.id === activeCourseId;
                return (
                    <button
                        key={course.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => void onSelect(course.id)}
                        aria-pressed={active}
                        className={cn(
                            "-mb-px border-b-2 transition-colors disabled:opacity-50",
                            compact ? "whitespace-nowrap pb-0.5 text-xs" : "pb-1.5 text-sm",
                            course.script === "hanzi" ? "font-cjk font-medium" : "font-semibold",
                            active
                                ? "border-accent text-fg"
                                : "border-transparent text-muted hover:text-fg",
                        )}
                    >
                        {course.nativeName}
                        <span className={cn("meta ml-1.5 hidden font-normal tracking-[0.1em]", !compact && "sm:inline")}>
                            {course.unitNoun === "book"
                                ? tc("unitBook")
                                : tc("unitBand")}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
