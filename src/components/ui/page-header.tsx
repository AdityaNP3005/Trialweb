import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

type MetaItem = { label: string; value: string };

/**
 * One header pattern for every page: eyebrow (mono), display title, optional
 * description, a mono meta row, and a ruled bottom edge instead of a card.
 */
export function PageHeader({
    eyebrow,
    title,
    description,
    meta,
    actions,
    back,
    className,
}: {
    eyebrow?: string;
    title: React.ReactNode;
    description?: React.ReactNode;
    meta?: MetaItem[];
    actions?: React.ReactNode;
    back?: { href: string; label: string };
    className?: string;
}) {
    return (
        <header className={cn("border-b border-border pb-5", className)}>
            {back ? (
                <Link
                    href={back.href}
                    className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-fg"
                >
                    <ArrowLeft className="size-3.5" />
                    {back.label}
                </Link>
            ) : null}

            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <div className="min-w-0">
                    {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
                    <h1 className="display mt-1.5 text-3xl leading-[1.1] sm:text-[2.125rem]">
                        {title}
                    </h1>
                    {description ? (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                            {description}
                        </p>
                    ) : null}
                </div>
                {actions ? (
                    <div className="flex flex-wrap items-center gap-2">{actions}</div>
                ) : null}
            </div>

            {meta && meta.length > 0 ? (
                <dl className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                    {meta.map((item) => (
                        <div key={item.label} className="flex items-baseline gap-2">
                            <dt className="eyebrow">{item.label}</dt>
                            <dd className="num text-sm font-semibold">{item.value}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}
        </header>
    );
}

/** Section label + optional hint, used between header and list/grid blocks. */
export function SectionHeading({
    children,
    hint,
    action,
    className,
}: {
    children: React.ReactNode;
    hint?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-wrap items-baseline justify-between gap-2", className)}>
            <div>
                <h2 className="eyebrow text-fg">{children}</h2>
                {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
            </div>
            {action}
        </div>
    );
}
