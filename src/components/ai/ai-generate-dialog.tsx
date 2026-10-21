"use client";

import { useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CefrLevel } from "@/types";
import type { AiCard } from "@/lib/validation/schemas";
import { useAuth } from "@/components/providers/auth-provider";
import { useStore } from "@/components/providers/store-provider";
import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";

export function AiGenerateDialog({
    open,
    onClose,
    deckId,
    courseId,
    level,
    onImported,
}: {
    open: boolean;
    onClose: () => void;
    deckId: string;
    courseId: string;
    level: CefrLevel;
    onImported: () => void;
}) {
    const { user } = useAuth();
    const { store } = useStore();
    const t = useTranslations("ai");
    const tc = useTranslations("common");

    const [topic, setTopic] = useState("");
    const [count, setCount] = useState(10);
    const [cards, setCards] = useState<AiCard[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notConfigured, setNotConfigured] = useState(false);

    // AI is the one paid feature: it always requires a real account.
    const signedIn = Boolean(user);

    async function handleGenerate() {
        if (!user || topic.trim().length < 2) return;
        setBusy(true);
        setError(null);
        setCards(null);
        setNotConfigured(false);
        try {
            const token = await user.getIdToken();
            const response = await fetch("/api/ai/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ topic, count, level }),
            });

            if (response.status === 503) {
                setNotConfigured(true);
                return;
            }
            if (!response.ok) throw new Error("request failed");

            const payload = (await response.json()) as { cards: AiCard[] };
            setCards(payload.cards);
        } catch {
            setError(t("error"));
        } finally {
            setBusy(false);
        }
    }

    async function handleSave() {
        if (!store || !cards) return;
        setSaving(true);
        setError(null);
        try {
            await store.bulkCreateCards(
                deckId,
                cards.map((card) => ({
                    ...card,
                    deckId,
                    courseId,
                    level,
                    ipa: null,
                    source: "ai",
                    suspended: false,
                })),
            );
            onImported();
            setCards(null);
            setTopic("");
            onClose();
        } catch {
            setError(t("error"));
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title={t("title")}
            description={t("body")}
            footer={
                !signedIn ? (
                    <Button variant="ghost" onClick={onClose}>
                        {tc("close")}
                    </Button>
                ) : (
                    <>
                        <Button variant="ghost" onClick={onClose}>
                            {tc("close")}
                        </Button>
                        {cards ? (
                            <Button onClick={handleSave} loading={saving}>
                                {t("accept", { count: cards.length })}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleGenerate}
                                loading={busy}
                                disabled={topic.trim().length < 2}
                            >
                                <Sparkles className="size-4" />
                                {t("generate")}
                            </Button>
                        )}
                    </>
                )
            }
        >
            {!signedIn ? (
                <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-xl bg-accent-soft px-4 py-3 text-accent">
                        <Lock className="mt-0.5 size-4 shrink-0" />
                        <p className="text-sm leading-relaxed">{t("loginRequired")}</p>
                    </div>
                    <Link href="/login" className={buttonStyles({ className: "w-full" })}>
                        {t("loginCta")}
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="ai-topic">{t("topic")}</Label>
                        <Input
                            id="ai-topic"
                            value={topic}
                            onChange={(event) => setTopic(event.target.value)}
                            placeholder={t("topicPlaceholder")}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="ai-count">{t("count")}</Label>
                            <Select
                                id="ai-count"
                                value={count}
                                onChange={(event) => setCount(Number(event.target.value))}
                            >
                                {[5, 10, 15, 20].map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <Label>Level</Label>
                            <Input value={level} readOnly className="bg-surface-2" />
                        </div>
                    </div>

                    {notConfigured ? (
                        <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                            {t("notConfigured")}
                        </p>
                    ) : null}

                    {busy ? (
                        <div className="flex items-center gap-2 text-sm text-muted">
                            <span className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                            {t("generating")}
                        </div>
                    ) : null}

                    {cards ? (
                        <div className="space-y-1.5">
                            <p className="text-xs font-bold uppercase tracking-wide text-muted">
                                {t("preview", { count: cards.length })}
                            </p>
                            <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                                {cards.map((card, index) => (
                                    <li
                                        key={`${card.front}-${index}`}
                                        className="flex items-baseline justify-between gap-2 rounded-lg px-2 py-1 text-sm odd:bg-surface-2/60"
                                    >
                                        <span className="font-medium">{card.front}</span>
                                        <span className="truncate text-xs text-muted">{card.meaningId}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {error ? (
                        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
                    ) : null}
                </div>
            )}
        </Dialog>
    );
}
