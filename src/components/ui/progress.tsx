import { cn } from "@/lib/utils/cn";

export function Progress({
    value,
    max = 100,
    className,
    label,
}: {
    value: number;
    max?: number;
    className?: string;
    label?: string;
}) {
    const safeMax = max <= 0 ? 1 : max;
    const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

    return (
        <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={safeMax}
            aria-valuenow={value}
            aria-label={label}
            className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
        >
            <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${percent}%` }}
            />
        </div>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            aria-hidden
            className={cn("animate-pulse rounded-xl bg-surface-2", className)}
        />
    );
}
