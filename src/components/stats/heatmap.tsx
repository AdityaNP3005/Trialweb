"use client";

import type { DailyStat } from "@/types";
import { addDays, dateKey } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

/* Ink density: the busier the day, the darker the square. No colour glow. */
const levels = [
    "bg-surface-2",
    "bg-fg/15",
    "bg-fg/35",
    "bg-fg/60",
    "bg-fg/85",
];

export function Heatmap({
    stats,
    days = 91,
    locale,
}: {
    stats: DailyStat[];
    days?: number;
    locale: string;
}) {
    const counts = new Map(stats.map((entry) => [entry.date, entry.reviews]));
    const today = new Date();

    const cells = Array.from({ length: days }, (_, index) => {
        const date = addDays(today, index - days + 1);
        const key = dateKey(date);
        return { key, date, count: counts.get(key) ?? 0 };
    });

    const max = Math.max(1, ...cells.map((cell) => cell.count));
    const leading = cells[0]?.date.getDay() ?? 0;

    return (
        <div className="overflow-x-auto">
            <div
                className="grid w-max grid-flow-col grid-rows-7 gap-[3px]"
                style={{ gridAutoColumns: "0.6875rem" }}
            >
                {Array.from({ length: leading }).map((_, index) => (
                    <div key={`pad-${index}`} aria-hidden className="size-[11px]" />
                ))}
                {cells.map((cell) => {
                    const level =
                        cell.count === 0
                            ? 0
                            : Math.min(4, Math.ceil((cell.count / max) * 4));

                    return (
                        <div
                            key={cell.key}
                            title={`${cell.date.toLocaleDateString(locale, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                            })}: ${cell.count}`}
                            className={cn("size-[11px] rounded-[2px]", levels[level])}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export const heatmapLevels = levels;
