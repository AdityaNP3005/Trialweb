"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { AuthCard, GoogleButton } from "@/components/auth/auth-card";
import { authErrorCode, authErrorKey, signInWithGoogle, signUpWithEmail } from "@/lib/firebase/auth";

export default function SignupPage() {
    const t = useTranslations("auth");
    const te = useTranslations("errors");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState<"email" | "google" | null>(null);
    const [errorKey, setErrorKey] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (password.length < 8) {
            setErrorKey("weakPassword");
            return;
        }
        setBusy("email");
        setErrorKey(null);
        try {
            await signUpWithEmail(email, password, name.trim() || undefined);
        } catch (error) {
            setErrorKey(authErrorKey(error));
            setErrorCode(authErrorCode(error));
        } finally {
            setBusy(null);
        }
    }

    async function handleGoogle() {
        setBusy("google");
        setErrorKey(null);
        setErrorCode(null);
        try {
            await signInWithGoogle();
        } catch (error) {
            setErrorKey(authErrorKey(error));
            setErrorCode(authErrorCode(error));
        } finally {
            setBusy(null);
        }
    }

    return (
        <AuthCard
            title={t("signupTitle")}
            footer={
                <>
                    {t("haveAccount")}{" "}
                    <Link href="/login" className="font-semibold text-accent hover:underline">
                        {t("submitLogin")}
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
                    <Label htmlFor="name">
                        {t("name")}{" "}
                        <span className="font-normal normal-case">(optional)</span>
                    </Label>
                    <Input
                        id="name"
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                </div>
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
                    <Label htmlFor="password">{t("password")}</Label>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                    <p className="mt-1.5 text-xs text-muted">{t("passwordHint")}</p>
                </div>

                {errorKey ? (
                    <p role="alert" className="border-l-2 border-danger pl-3 text-xs text-danger">
                        {te(errorKey)}
                        {errorKey === "unknown" && errorCode ? (
                            <span className="mt-1 block font-mono text-[10px] opacity-70">
                                {errorCode}
                            </span>
                        ) : null}
                    </p>
                ) : null}

                <Button type="submit" className="w-full" loading={busy === "email"}>
                    {t("submitSignup")}
                </Button>
            </form>
        </AuthCard>
    );
}
