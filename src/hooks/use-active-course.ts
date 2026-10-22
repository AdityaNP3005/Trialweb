"use client";

import { useEffect } from "react";
import { useStore } from "@/components/providers/store-provider";

/**
 * Deep links into a course-specific page (e.g. /writing while German is
 * active) switch the active course, as the level page does.
 */
export function useActiveCourse(courseId: string) {
    const { store, profile, refreshProfile } = useStore();
    const active = profile?.activeCourseId;

    useEffect(() => {
        if (!store || !active || active === courseId) return;
        void store.updateProfile({ activeCourseId: courseId }).then(() => refreshProfile());
    }, [store, active, courseId, refreshProfile]);
}
