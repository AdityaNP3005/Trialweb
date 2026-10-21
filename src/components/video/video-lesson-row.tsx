"use client";

import { CheckCircle2, CirclePlay } from "lucide-react";
import { useTranslations } from "next-intl";
import type { VideoLesson } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";
import { formatClock, type WatchState } from "@/lib/video/progress";

export function VideoLessonRow({
    lesson,
    state,
    percent,
    active,
    onSelect,
}: {
    lesson: VideoLesson;
    state: WatchState;
    percent: number;
    active: boolean;
    onSelect: () => void;
}) {
    const t = useTranslations("video");

    return (
        <li className="border-b border-border">
            <button
                type="button"
                onClick={onSelect}
                aria-current={active ? "true" : undefined}
                className={cn(
                    "group flex w-full items-center gap-3 py-3 pr-2 text-left transition-colors sm:gap-4",
                    active ? "bg-accent-soft/50" : "hover:bg-surface-2/50",
                )}
            >
                <span
                    aria-hidden
                    className={cn(
                        "num w-6 shrink-0 text-right font-mono text-[11px]",
                        active ? "text-accent" : "text-muted",
                    )}
                >
                    {String(lesson.lesson).padStart(2, "0")}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p
                            className={cn(
                                "truncate text-[13.5px] leading-tight",
                                active ? "font-semibold" : "font-medium",
                            )}
                        >
                            {lesson.title}
                        </p>
                        {state === "done" ? (
                            <Badge tone="success">
                                <CheckCircle2 className="size-3" />
                                {t("statusDone")}
                            </Badge>
                        ) : state === "active" ? (
                            <Badge tone="accent">{t("statusActive")}</Badge>
                        ) : (
                            <Badge tone="neutral">{t("statusNew")}</Badge>
                        )}
                        {active ? (
                            <Badge tone="gold">
                                <CirclePlay className="size-3" />
                                {t("statusPlaying")}
                            </Badge>
                        ) : null}
                    </div>
                    <p className="meta mt-1">{formatClock(lesson.durationSec)}</p>
                    <Progress
                        value={percent}
                        tone={state === "done" ? "success" : "ink"}
                        className="mt-2 max-w-md"
                    />
                </div>
            </button>
        </li>
    );
}
