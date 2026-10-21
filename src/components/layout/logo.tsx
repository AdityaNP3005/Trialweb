import { cn } from "@/lib/utils/cn";

/**
 * Wordmark + route mark. The mark is a stamp ring with a dashed route between
 * an origin dot and a destination dot (the accent). No sparkles, no gradients.
 */
export function LogoMark({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 32 32"
            aria-hidden
            className={cn("size-7 shrink-0", className)}
            fill="none"
        >
            <rect
                x="1"
                y="1"
                width="30"
                height="30"
                rx="7"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <path
                d="M8.5 21.5c3.4 0 4.2-9.6 8.4-9.6 2.7 0 3.4 5.2 6.6 5.2"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeDasharray="2 2.4"
                strokeLinecap="round"
            />
            <circle cx="8.5" cy="21.5" r="1.9" fill="currentColor" />
            <circle cx="23.5" cy="17.1" r="2.4" fill="var(--accent)" />
        </svg>
    );
}

export function Logo({
    name,
    className,
    showName = true,
}: {
    name: string;
    className?: string;
    showName?: boolean;
}) {
    return (
        <span className={cn("flex items-center gap-2 text-fg", className)}>
            <LogoMark />
            {showName ? (
                <span className="display text-[17px] leading-none tracking-[-0.02em]">
                    {name}
                </span>
            ) : null}
        </span>
    );
}
