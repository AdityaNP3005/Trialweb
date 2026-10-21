"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { AuthCard } from "@/components/auth/auth-card";
import { authErrorKey, sendResetEmail } from "@/lib/firebase/auth";

export default function ResetPasswordPage() {
    const t = useTranslations("auth");
    const te = useTranslations("errors");

    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const [errorKey, setErrorKey] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setBusy(true);
        setErrorKey(null);
        try {
            await sendResetEmail(email);
            setSent(true);
        } catch (error) {
            setErrorKey(authErrorKey(error));
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthCard
            title={t("resetTitle")}
            subtitle={t("resetBody")}
            footer={
                <Link href="/login" className="font-semibold text-accent hover:underline">
                    {t("submitLogin")}
                </Link>
            }
        >
            {sent ? (
                <p className="border-l-2 border-success pl-3 text-sm text-success">
                    {t("resetSent")}
                </p>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="email">{t("email")}</Label>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </div>

                    {errorKey ? (
                        <p role="alert" className="border-l-2 border-danger pl-3 text-xs text-danger">
                            {te(errorKey)}
                        </p>
                    ) : null}

                    <Button type="submit" className="w-full" loading={busy}>
                        {t("sendReset")}
                    </Button>
                </form>
            )}
        </AuthCard>
    );
}
