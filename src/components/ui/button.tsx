import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
    primary:
        "bg-accent text-accent-fg hover:opacity-90 active:opacity-95 shadow-sm disabled:opacity-50",
    secondary:
        "bg-surface-2 text-fg border border-border hover:bg-surface hover:border-accent/40 disabled:opacity-50",
    ghost: "bg-transparent text-muted hover:bg-surface-2 hover:text-fg",
    danger: "bg-danger text-white hover:opacity-90 disabled:opacity-50",
    success: "bg-success text-white hover:opacity-90 disabled:opacity-50",
};

const sizes: Record<Size, string> = {
    sm: "h-8 px-3 text-[13px] gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-base gap-2",
};

export function buttonStyles({
    variant = "primary",
    size = "md",
    className,
}: {
    variant?: Variant;
    size?: Size;
    className?: string;
} = {}) {
    return cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-xl font-semibold transition-all",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
    );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
};

export function Button({
    variant = "primary",
    size = "md",
    loading = false,
    className,
    disabled,
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={buttonStyles({ variant, size, className })}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span
                    aria-hidden
                    className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
            ) : null}
            {children}
        </button>
    );
}
