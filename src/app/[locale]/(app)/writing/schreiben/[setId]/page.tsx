"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getSchreibenSet } from "@/lib/writing/schreiben-sets";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SchreibenExam } from "@/components/writing/schreiben-exam";
import { useActiveCourse } from "@/hooks/use-active-course";

export default function SchreibenSetPage() {
    const params = useParams<{ setId: string }>();
    const t = useTranslations("writing.de");
    const set = getSchreibenSet(params?.setId ?? "");
    useActiveCourse(set ? "de" : null);

    if (!set) return <EmptyState title={t("backToList")} />;

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <PageHeader
                eyebrow={`Goethe-Zertifikat ${set.level} · Schreiben`}
                title={set.title}
                back={{ href: "/writing?tab=schreiben", label: t("backToList") }}
            />
            <SchreibenExam set={set} />
        </div>
    );
}
