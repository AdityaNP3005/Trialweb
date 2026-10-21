import { cn } from "@/lib/utils/cn";

const tones = {
    neutral: "bg-surface-2 text-muted border-border",
    accent: "bg-accent-soft text-accent border-accent/30",
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    danger: "bg-danger/10 text-danger border-danger/30",
} as const;

export function Badge({
    tone = "neutral",
    className,
    children,
}: {
    tone?: keyof typeof tones;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                tones[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}
