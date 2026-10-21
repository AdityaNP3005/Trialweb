import { cn } from "@/lib/utils/cn";

/** Thin ruled bar. Reads as a print rule, not a pill-shaped "progress widget". */
export function Progress({
    value,
    max = 100,
    className,
    label,
    tone = "ink",
}: {
    value: number;
    max?: number;
    className?: string;
    label?: string;
    tone?: "ink" | "success" | "accent";
}) {
    const safeMax = max <= 0 ? 1 : max;
    const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));
    const fill =
        tone === "success" ? "bg-success" : tone === "accent" ? "bg-accent" : "bg-fg";

    return (
        <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={safeMax}
            aria-valuenow={value}
            aria-label={label}
            className={cn("h-[3px] w-full overflow-hidden bg-border", className)}
        >
            <div
                className={cn("h-full transition-[width] duration-300", fill)}
                style={{ width: `${percent}%` }}
            />
        </div>
    );
}

/**
 * The route metaphor for a section: a hairline with stops, a filled track up to
 * the current position. Falls back to nothing but the numbers at low widths.
 */
export function RouteProgress({
    percent,
    stops,
    className,
    label,
}: {
    percent: number;
    stops?: number;
    className?: string;
    label?: string;
}) {
    const safe = Math.min(100, Math.max(0, percent));
    const count = Math.min(24, Math.max(2, stops ?? 0));

    return (
        <div className={cn("w-full", className)} aria-hidden>
            <div className="route-line" style={{ "--route-fill": `${safe}%` } as React.CSSProperties}>
                {stops ? (
                    <div className="absolute inset-0 flex items-center justify-between">
                        {Array.from({ length: count }).map((_, index) => {
                            const at = (index / (count - 1)) * 100;
                            const passed = at <= safe + 0.001;
                            return (
                                <span
                                    key={index}
                                    className={cn(
                                        "size-[3px] rounded-full",
                                        passed ? "bg-fg" : "bg-border",
                                    )}
                                />
                            );
                        })}
                    </div>
                ) : null}
                <span
                    className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full border-2 border-bg bg-accent"
                    style={{ left: `calc(${safe}% - 4px)` }}
                />
            </div>
            {label ? <p className="mt-1.5 meta">{label}</p> : null}
        </div>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            aria-hidden
            className={cn("animate-pulse rounded-[0.375rem] bg-surface-2", className)}
        />
    );
}
