"use client";

import { useTranslations } from "next-intl";
import { courses } from "@/content/courses";
import { cn } from "@/lib/utils/cn";

/**
 * Language selector shared by every page that shows content. Reads as a set of
 * destination tabs: the native name in its own script, a hairline underline for
 * the active route, no pills.
 */
export function CourseSwitcher({
    activeCourseId,
    disabled = false,
    onSelect,
}: {
    activeCourseId: string;
    disabled?: boolean;
    onSelect: (courseId: string) => void | Promise<void>;
}) {
    const enabled = courses.filter((course) => course.enabled);
    const tc = useTranslations("common");

    return (
        <div className="flex items-center gap-5" role="group" aria-label="Course">
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
                            "-mb-px border-b-2 pb-1.5 text-sm transition-colors disabled:opacity-50",
                            course.script === "hanzi" ? "font-cjk" : "font-semibold",
                            active
                                ? "border-accent text-fg"
                                : "border-transparent text-muted hover:text-fg",
                        )}
                    >
                        {course.nativeName}
                        <span className="meta ml-1.5 hidden font-normal tracking-[0.1em] sm:inline">
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
