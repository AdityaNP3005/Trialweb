"use client";

import { Globe, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function AuthCard({
    title,
    subtitle,
    children,
    footer,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    const t = useTranslations("common");

    return (
        <div className="animate-rise surface-card p-6 sm:p-7">
            <Link href="/" className="mb-6 flex items-center gap-2 font-bold tracking-tight">
                <span className="grid size-8 place-items-center rounded-xl bg-accent text-accent-fg">
                    <Sparkles className="size-4" />
                </span>
                {t("appName")}
            </Link>
            <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
            <div className="mt-6">{children}</div>
            {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
        </div>
    );
}

export function GoogleButton({
    onClick,
    loading,
    label,
}: {
    onClick: () => void;
    loading?: boolean;
    label: string;
}) {
    return (
        <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={onClick}
            loading={loading}
        >
            {loading ? null : <Globe className="size-4" />}
            {label}
        </Button>
    );
}
