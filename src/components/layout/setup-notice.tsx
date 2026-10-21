"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonStyles } from "@/components/ui/button";

export function SetupNotice() {
    const t = useTranslations("setup");
    const ta = useTranslations("auth");

    return (
        <div className="surface-card w-full p-6">
            <div className="mb-3 flex items-center gap-2 text-warning">
                <AlertTriangle className="size-5" />
                <h1 className="text-base font-bold text-fg">{t("title")}</h1>
            </div>
            <p className="text-sm leading-relaxed text-muted">{t("body")}</p>
            <code className="mt-4 block rounded-lg bg-surface-2 p-3 text-xs">
                cp .env.example .env.local
            </code>
            <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-sm font-semibold text-accent hover:underline"
            >
                {t("docs")} →
            </a>

            <div className="mt-6 border-t border-border pt-4">
                <p className="mb-3 text-xs text-muted">{ta("guestNote")}</p>
                <Link href="/dashboard" className={buttonStyles({ size: "sm" })}>
                    {ta("continueGuest")}
                </Link>
            </div>
        </div>
    );
}
