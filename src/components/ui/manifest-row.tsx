import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { Progress } from "./progress";

/**
 * A row in the "manifest": number, title, status, route progress. Rows are
 * separated by hairlines instead of bordered cards, so a list of 60 chapters
 * stays readable. `trailing` is rendered outside the link so actions such as
 * "reset cycle" are not nested inside an anchor.
 */
export function ManifestRow({
    href,
    index,
    title,
    meta,
    status,
    percent,
    trailing,
    tone = "ink",
}: {
    href: string;
    index: number;
    title: string;
    meta: string;
    status?: React.ReactNode;
    percent: number;
    trailing?: React.ReactNode;
    tone?: "ink" | "success" | "accent";
}) {
    return (
        <li className="group relative border-b border-border">
            <Link
                href={href}
                className={cn(
                    "group flex items-center gap-3 py-3 transition-colors sm:gap-4",
                    "hover:bg-surface-2/50",
                    trailing ? "pr-14" : "pr-6",
                )}
            >
                <span
                    className="num w-6 shrink-0 text-right font-mono text-[11px] text-muted"
                    aria-hidden
                >
                    {String(index).padStart(2, "0")}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-[13.5px] font-semibold leading-tight">
                            {title}
                        </p>
                        {status}
                    </div>
                    <p className="meta mt-1">{meta}</p>
                    <Progress
                        value={percent}
                        tone={tone}
                        className="mt-2 max-w-md"
                        label={undefined}
                    />
                </div>

                {!trailing ? (
                    <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
                ) : null}
            </Link>

            {trailing ? (
                <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    {trailing}
                    <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
                </div>
            ) : null}
        </li>
    );
}
