/** Local-date key (`YYYY-MM-DD`) used as the dailyStats document id. */
export function dateKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function addDays(date: Date, amount: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
}

export function daysBetween(a: string, b: string): number {
    const start = new Date(`${a}T00:00:00`);
    const end = new Date(`${b}T00:00:00`);
    return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function formatDuration(ms: number): string {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function formatNumber(value: number, locale: string): string {
    return new Intl.NumberFormat(locale).format(value);
}
