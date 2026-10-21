"use client";

import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeShort, routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

export function LocaleSwitcher({ className }: { className?: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams<{ locale: string }>();
    const [pending, startTransition] = useTransition();
    const active = params?.locale ?? routing.defaultLocale;

    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 border-r border-border pr-2.5",
                pending && "opacity-60",
                className,
            )}
            role="group"
            aria-label="Language"
        >
            {routing.locales.map((locale, index) => (
                <span key={locale} className="flex items-center gap-1.5">
                    {index > 0 ? (
                        <span aria-hidden className="font-mono text-[10px] text-border">
                            /
                        </span>
                    ) : null}
                    <button
                        type="button"
                        aria-pressed={active === locale}
                        onClick={() =>
                            startTransition(() => {
                                router.replace(pathname, { locale: locale as AppLocale });
                            })
                        }
                        className={cn(
                            "font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors",
                            active === locale
                                ? "text-fg"
                                : "text-muted hover:text-fg",
                        )}
                    >
                        {localeShort[locale as AppLocale]}
                    </button>
                </span>
            ))}
        </div>
    );
}
