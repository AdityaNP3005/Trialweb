"use client";

import { CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonStyles } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils/date";

export type SessionSummaryData = {
    total: number;
    correct: number;
    newCards: number;
    durationMs: number;
};

export function SessionSummary({ data }: { data: SessionSummaryData }) {
    const t = useTranslations("study");
    const accuracy =
        data.total === 0 ? 0 : Math.round((data.correct / data.total) * 100);

    return (
        <div className="mx-auto max-w-md">
            <div className="surface-card animate-rise p-6 text-center">
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-success/10 text-success">
                    <CheckCircle2 className="size-7" />
                </div>
                <h1 className="text-xl font-extrabold tracking-tight">{t("summaryTitle")}</h1>
                <p className="mt-1 text-sm text-muted">
                    {t("summaryBody", { count: data.total })}
                </p>

                <div className="mt-6 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-surface-2 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            {t("accuracy")}
                        </p>
                        <p className="text-lg font-extrabold">{accuracy}%</p>
                    </div>
                    <div className="rounded-xl bg-surface-2 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            {t("newCards")}
                        </p>
                        <p className="text-lg font-extrabold">{data.newCards}</p>
                    </div>
                    <div className="rounded-xl bg-surface-2 p-3">
                        <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                            <Clock className="size-2.5" />
                            {t("duration")}
                        </p>
                        <p className="text-sm font-extrabold">{formatDuration(data.durationMs)}</p>
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                    <Link
                        href="/dashboard"
                        className={buttonStyles({ className: "flex-1" })}
                    >
                        {t("backToDashboard")}
                    </Link>
                    <Link
                        href="/decks"
                        className={buttonStyles({ variant: "secondary", className: "flex-1" })}
                    >
                        <RotateCcw className="size-4" />
                        {t("runAgain")}
                    </Link>
                </div>
            </div>
        </div>
    );
}
