import { cn } from "@/lib/utils/cn";

const tones = {
    neutral: "text-muted",
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    gold: "text-gold",
} as const;

export type StampTone = keyof typeof tones;

/**
 * A passport stamp. Status copy always sits on a straight baseline — the tilt
 * and the double ring are decoration, so they never carry meaning on their own.
 */
export function Badge({
    tone = "neutral",
    className,
    children,
    tilt = false,
    double = false,
}: {
    tone?: StampTone;
    className?: string;
    children: React.ReactNode;
    tilt?: boolean;
    double?: boolean;
}) {
    return (
        <span
            className={cn(
                "stamp",
                tilt && "stamp--tilt",
                double && "stamp--double",
                tones[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}
