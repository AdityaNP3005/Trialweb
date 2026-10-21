import type { DailyStat } from "@/types";
import { addDays, dateKey } from "@/lib/utils/date";

/**
 * Streak = number of consecutive days with at least one review, ending today
 * (or yesterday, so the streak does not reset before the user studies today).
 */
export function computeStreak(
    stats: Pick<DailyStat, "date" | "reviews">[],
    today: Date = new Date(),
): { current: number; longest: number } {
    const active = new Set(
        stats.filter((entry) => entry.reviews > 0).map((entry) => entry.date),
    );

    const todayKey = dateKey(today);
    const yesterdayKey = dateKey(addDays(today, -1));

    let current = 0;
    let cursor = active.has(todayKey) ? today : addDays(today, -1);
    if (active.has(todayKey) || active.has(yesterdayKey)) {
        while (active.has(dateKey(cursor))) {
            current += 1;
            cursor = addDays(cursor, -1);
        }
    }

    const sorted = [...active].sort();
    let longest = 0;
    let run = 0;
    let previous: string | null = null;

    for (const day of sorted) {
        if (previous && isNextDay(previous, day)) {
            run += 1;
        } else {
            run = 1;
        }
        longest = Math.max(longest, run);
        previous = day;
    }

    return { current, longest };
}

function isNextDay(previous: string, next: string): boolean {
    const prev = new Date(`${previous}T00:00:00`);
    const expected = dateKey(addDays(prev, 1));
    return expected === next;
}
