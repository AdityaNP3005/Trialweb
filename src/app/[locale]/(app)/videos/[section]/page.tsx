"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/components/providers/store-provider";
import { getCourse, getCourseForSection } from "@/content/courses";
import { videoPlaylist } from "@/lib/content/videos";
import { sectionLabelFor } from "@/lib/content/labels";
import { VideoHub } from "@/components/video/video-hub";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { buttonStyles } from "@/components/ui/button";

export default function VideoSectionPage() {
    const params = useParams<{ section: string }>();
    const sectionId = params?.section ?? "";
    const { profile } = useStore();
    const t = useTranslations("video");
    const tc = useTranslations("common");

    const course = getCourseForSection(sectionId) ?? getCourse(profile?.activeCourseId);
    const playlist = videoPlaylist(course.id, sectionId);

    if (!playlist) {
        return (
            <div className="space-y-6">
                <PageHeader
                    back={{ href: "/videos", label: t("backToVideos") }}
                    eyebrow={`${course.nativeName} · ${t("title")}`}
                    title={t("emptyTitle")}
                    description={t("emptyBody")}
                />
                <EmptyState
                    title={t("emptyTitle")}
                    body={t("emptyBody")}
                    action={
                        <Link
                            href={`/levels/${sectionId}`}
                            className={buttonStyles({ size: "sm" })}
                        >
                            {t("emptyCta")}
                        </Link>
                    }
                />
            </div>
        );
    }

    return (
        <VideoHub
            playlist={playlist}
            sectionLabel={sectionLabelFor(
                playlist.sectionId,
                getCourse(playlist.courseId).unitNoun,
                tc,
            )}
        />
    );
}
