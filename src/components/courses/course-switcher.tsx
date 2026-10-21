"use client";

import { courses } from "@/content/courses";
import { cn } from "@/lib/utils/cn";

/**
 * Language pills shared by every page that shows content, so a course can be
 * switched without going back to the dashboard.
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

    return (
        <div className="flex flex-wrap gap-2">
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
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50",
                            active
                                ? "bg-accent font-bold text-accent-fg"
                                : "border border-border bg-surface text-muted hover:text-fg",
                        )}
                    >
                        <span aria-hidden>{course.flag}</span>
                        {course.nativeName}
                    </button>
                );
            })}
        </div>
    );
}
