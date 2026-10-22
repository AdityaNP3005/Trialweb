"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/components/providers/store-provider";

/**
 * A deep link into a course-specific page (e.g. a Mandarin writing chapter
 * while German is active) switches the active course once, when the page
 * opens. Later switches from the header are left alone.
 */
export function useActiveCourse(courseId: string | null) {
    const { store, profile, refreshProfile } = useStore();
    const active = profile?.activeCourseId;
    const checked = useRef(false);

    useEffect(() => {
        if (checked.current || !store || !active || !courseId) return;
        checked.current = true;
        if (active === courseId) return;
        void store.updateProfile({ activeCourseId: courseId }).then(() => refreshProfile());
    }, [store, active, courseId, refreshProfile]);
}
