"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonStyles } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { AuthCard, GoogleButton } from "@/components/auth/auth-card";
import { authErrorKey, signInWithEmail, signInWithGoogle } from "@/lib/firebase/auth";

export default function LoginPage() {
    const t = useTranslations("auth");
    const te = useTranslations("errors");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState<"email" | "google" | null>(null);
    const [errorKey, setErrorKey] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!email || !password) return;
        setBusy("email");
        setErrorKey(null);
        try {
            await signInWithEmail(email, password);
        } catch (error) {
            setErrorKey(authErrorKey(error));
        } finally {
            setBusy(null);
        }
    }

    async function handleGoogle() {
        setBusy("google");
        setErrorKey(null);
        try {
            await signInWithGoogle();
        } catch (error) {
            setErrorKey(authErrorKey(error));
        } finally {
            setBusy(null);
        }
    }

    return (
        <AuthCard
            title={t("loginTitle")}
            footer={
                <>
                    {t("noAccount")}{" "}
                    <Link href="/signup" className="font-semibold text-accent hover:underline">
                        {t("submitSignup")}
                    </Link>
                </>
            }
        >
            <GoogleButton
                onClick={handleGoogle}
                loading={busy === "google"}
                label={t("continueGoogle")}
            />

            <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <span className="h-px flex-1 bg-border" />
                {t("or")}
                <span className="h-px flex-1 bg-border" />
            </div>

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
                <div>
                    <div className="flex items-baseline justify-between">
                        <Label htmlFor="password">{t("password")}</Label>
                        <Link
                            href="/reset-password"
                            className="mb-1.5 text-[11px] font-semibold text-accent hover:underline"
                        >
                            {t("forgot")}
                        </Link>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </div>

                {errorKey ? (
                    <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                        {te(errorKey)}
                    </p>
                ) : null}

                <Button type="submit" className="w-full" loading={busy === "email"}>
                    {t("submitLogin")}
                </Button>
            </form>

            <div className="mt-5 border-t border-border pt-4 text-center">
                <p className="mb-2 text-xs text-muted">{t("guestNote")}</p>
                <Link
                    href="/dashboard"
                    className={buttonStyles({ variant: "ghost", size: "sm" })}
                >
                    {t("continueGuest")}
                </Link>
            </div>
        </AuthCard>
    );
}
