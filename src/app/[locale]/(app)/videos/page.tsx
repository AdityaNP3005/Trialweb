"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useStore } from "@/components/providers/store-provider";
import { getCourse } from "@/content/courses";
import { videoSections } from "@/lib/content/videos";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { buttonStyles } from "@/components/ui/button";

/**
 * Entry point for the "Video" nav item: opens the first section of the active
 * course that has a playlist (currently German A1).
 */
export default function VideosIndexPage() {
    const { profile } = useStore();
    const router = useRouter();
    const t = useTranslations("video");

    const course = getCourse(profile?.activeCourseId);
    const sections = videoSections(course.id);
    const first = sections[0];

    useEffect(() => {
        if (first) router.replace(`/videos/${first}`);
    }, [first, router]);

    if (first) {
        return (
            <div className="space-y-4">
                <p className="meta">{t("loading")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow={`${course.nativeName} · ${t("title")}`}
                title={t("emptyTitle")}
                description={t("emptyBody")}
            />
            <EmptyState
                title={t("emptyTitle")}
                body={t("emptyBody")}
                action={
                    <Link href="/dashboard" className={buttonStyles({ size: "sm" })}>
                        {t("emptyCta")}
                    </Link>
                }
            />
        </div>
    );
}
