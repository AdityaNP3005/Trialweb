"use client";

import { Clock, Repeat2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonStyles } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils/date";

export type SessionSummaryData = {
    total: number;
    next: number;
    repeat: number;
    cycle: number;
    cycleReset: boolean;
    durationMs: number;
};

export function SessionSummary({ data }: { data: SessionSummaryData }) {
    const t = useTranslations("study");

    return (
        <div className="mx-auto max-w-md">
            <div className="panel animate-rise p-6">
                <div className="flex items-start justify-between gap-3">
                    <span className="eyebrow">{t("summaryTitle")}</span>
                    <span className="stamp stamp--tilt stamp--double text-accent">
                        {String(data.cycle).padStart(2, "0")}
                    </span>
                </div>

                <h1 className="display mt-3 text-2xl leading-tight">
                    {t("summaryTitle")}
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {t("summaryBody", { count: data.total })}
                </p>

                <div className="tear" />

                <dl className="grid grid-cols-3 gap-3">
                    <div>
                        <dt className="eyebrow">{t("actionNext")}</dt>
                        <dd className="num mt-1 text-2xl font-semibold text-success">
                            {data.next}
                        </dd>
                    </div>
                    <div>
                        <dt className="eyebrow flex items-center gap-1">
                            <Repeat2 className="size-3" />
                            {t("actionRepeat")}
                        </dt>
                        <dd className="num mt-1 text-2xl font-semibold text-warning">
                            {data.repeat}
                        </dd>
                    </div>
                    <div>
                        <dt className="eyebrow flex items-center gap-1">
                            <Clock className="size-3" />
                            {t("duration")}
                        </dt>
                        <dd className="mt-1 text-lg font-semibold">
                            {formatDuration(data.durationMs)}
                        </dd>
                    </div>
                </dl>

                {data.cycleReset ? (
                    <p className="mt-4 border-l-2 border-accent pl-3 text-xs font-semibold text-accent">
                        {t("cycleResetNotice", { cycle: data.cycle })}
                    </p>
                ) : null}

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                    <Link href="/dashboard" className={buttonStyles({ className: "flex-1" })}>
                        {t("backToDashboard")}
                    </Link>
                    <Link
                        href="/stats"
                        className={buttonStyles({ variant: "secondary", className: "flex-1" })}
                    >
                        {t("viewProgress")}
                    </Link>
                </div>
            </div>
        </div>
    );
}
