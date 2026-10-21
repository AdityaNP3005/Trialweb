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
                "inline-flex items-center rounded-lg border border-border bg-surface p-0.5",
                pending && "opacity-60",
                className,
            )}
            role="group"
            aria-label="Language"
        >
            {routing.locales.map((locale) => (
                <button
                    key={locale}
                    type="button"
                    aria-pressed={active === locale}
                    onClick={() =>
                        startTransition(() => {
                            router.replace(pathname, { locale: locale as AppLocale });
                        })
                    }
                    className={cn(
                        "rounded-md px-2 py-1 text-[11px] font-bold tracking-wide transition",
                        active === locale
                            ? "bg-accent text-accent-fg"
                            : "text-muted hover:text-fg",
                    )}
                >
                    {localeShort[locale as AppLocale]}
                </button>
            ))}
        </div>
    );
}
