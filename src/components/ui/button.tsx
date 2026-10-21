import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
    primary:
        "bg-fg text-bg border border-fg hover:bg-fg/90 active:bg-fg disabled:opacity-45",
    secondary:
        "bg-transparent text-fg border border-border hover:border-fg/45 hover:bg-surface-2/60 disabled:opacity-45",
    ghost:
        "bg-transparent text-muted border border-transparent hover:text-fg hover:bg-surface-2/70 disabled:opacity-45",
    danger:
        "bg-danger text-accent-fg border border-danger hover:bg-danger/90 disabled:opacity-45",
    success:
        "bg-success text-accent-fg border border-success hover:bg-success/90 disabled:opacity-45",
};

const sizes: Record<Size, string> = {
    sm: "h-8 px-3 text-[12px] gap-1.5",
    md: "h-10 px-4 text-[13px] gap-2",
    lg: "h-12 px-6 text-sm gap-2",
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
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-[0.375rem] font-semibold tracking-[-0.005em] transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
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
                    className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
                />
            ) : null}
            {children}
        </button>
    );
}
