"use client";

import { useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useStore } from "@/components/providers/store-provider";
import { CourseSwitcher } from "@/components/courses/course-switcher";

/** Pages that already show the full-size switcher. */
const OWN_SWITCHER = new Set(["/dashboard", "/decks"]);

/**
 * Course switcher in the header, so every page can change the studied
 * language. Pages tied to one course (a session, a level, a deck, a writing
 * chapter, a video section) go back to their list first.
 */
export function HeaderCourseSwitcher() {
    const { store, profile, refreshProfile } = useStore();
    const pathname = usePathname();
    const router = useRouter();
    const [switching, setSwitching] = useState(false);
    const activeCourseId = profile?.activeCourseId ?? "de";

    if (OWN_SWITCHER.has(pathname)) return null;

    async function select(courseId: string) {
        if (!store || courseId === activeCourseId) return;
        setSwitching(true);
        const [root, ...rest] = pathname.split("/").filter(Boolean);
        try {
            // Switch first, then leave: list pages such as /videos redirect by the
            // active course, and would send us back to the old course's content.
            await store.updateProfile({ activeCourseId: courseId });
            await refreshProfile();
            if (rest.length > 0) {
                router.push(root === "study" || root === "levels" ? "/dashboard" : `/${root}`);
            }
        } finally {
            setSwitching(false);
        }
    }

    return (
        // Divider from the UI-language switcher, which only shows on wider screens.
        <div className="sm:mr-1 sm:border-r sm:border-border sm:pr-3">
            <CourseSwitcher compact activeCourseId={activeCourseId} disabled={switching} onSelect={select} />
        </div>
    );
}
