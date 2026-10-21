"use client";

import { useEffect, useState } from "react";
import {
    Download,
    FileJson,
    Languages,
    LogIn,
    Moon,
    Monitor,
    Sun,
    Trash2,
    Volume2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import type { Card, Deck } from "@/types";
import { useAuth } from "@/components/providers/auth-provider";
import { useStore } from "@/components/providers/store-provider";
import { useTheme, type Theme } from "@/components/providers/theme-provider";
import { useSpeech } from "@/hooks/use-speech";
import { cardsToCsv } from "@/lib/import/csv";
import { downloadFile, todayStamp } from "@/lib/utils/download";
import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

const themeOptions: {
    value: Theme;
    icon: typeof Sun;
    key: "themeLight" | "themeDark" | "themeSystem";
}[] = [
        { value: "light", icon: Sun, key: "themeLight" },
        { value: "dark", icon: Moon, key: "themeDark" },
        { value: "system", icon: Monitor, key: "themeSystem" },
    ];

export default function SettingsPage() {
    const { user } = useAuth();
    const { store, profile, refreshProfile } = useStore();
    const t = useTranslations("settings");
    const tc = useTranslations("common");
    const { theme, setTheme } = useTheme();
    const { germanVoices, speak } = useSpeech();
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams<{ locale: string }>();

    const [shuffleCards, setShuffleCards] = useState(false);
    const [ttsVoiceURI, setTtsVoiceURI] = useState("");
    const [ttsRate, setTtsRate] = useState(1);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [confirmWipe, setConfirmWipe] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!profile) return;
        setShuffleCards(Boolean(profile.prefs?.shuffleCards));
        setTtsVoiceURI(profile.ttsVoiceURI ?? "");
        setTtsRate(profile.ttsRate);
    }, [profile]);

    async function loadEverything(): Promise<{ decks: (Deck & { cards: Card[] })[] }> {
        if (!store) return { decks: [] };
        const decks = await store.listDecks();
        const withCards = await Promise.all(
            decks.map(async (deck) => ({
                ...deck,
                cards: await store.listCards(deck.id, 1000),
            })),
        );
        return { decks: withCards };
    }

    async function handleSave() {
        if (!store) return;
        setSaving(true);
        setError(null);
        try {
            await store.updateProfile({
                prefs: { shuffleCards },
                ttsRate,
                ttsVoiceURI: ttsVoiceURI || null,
            });
            await refreshProfile();
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2500);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : tc("retry"));
        } finally {
            setSaving(false);
        }
    }

    async function handleExportJson() {
        if (!store) return;
        setBusy("json");
        try {
            const [{ decks }, stats] = await Promise.all([
                loadEverything(),
                store.getRecentStats(365),
            ]);
            downloadFile(
                `goabroad-${todayStamp()}.json`,
                JSON.stringify(
                    {
                        exportedAt: new Date().toISOString(),
                        mode: store.mode,
                        profile,
                        decks,
                        dailyStats: stats,
                    },
                    null,
                    2,
                ),
                "application/json",
            );
        } finally {
            setBusy(null);
        }
    }

    async function handleExportCsv() {
        setBusy("csv");
        try {
            const { decks } = await loadEverything();
            const rows = decks.flatMap((deck) =>
                deck.cards.map((card) => ({
                    front: card.front,
                    meaningId: card.meaningId,
                    meaningEn: card.meaningEn,
                    tags: [...card.tags, deck.name],
                    level: card.level,
                })),
            );
            downloadFile(`goabroad-cards-${todayStamp()}.csv`, cardsToCsv(rows), "text/csv");
        } finally {
            setBusy(null);
        }
    }

    async function handleWipe() {
        if (!store) return;
        setBusy("wipe");
        setError(null);
        try {
            const decks = await store.listDecks();
            for (const deck of decks) {
                if (deck.readOnly) await store.resetDeckCycle(deck.id);
                else await store.deleteDeck(deck.id);
            }
            setConfirmWipe(false);
            router.replace("/dashboard");
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : tc("retry"));
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
            </div>

            <section className="surface-card p-5">
                <h2 className="mb-3 text-sm font-bold">{t("appearance")}</h2>
                <div className="flex flex-wrap items-center gap-3">
                    <Label className="mb-0">{t("theme")}</Label>
                    <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
                        {themeOptions.map(({ value, icon: Icon, key }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setTheme(value)}
                                aria-pressed={theme === value}
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition",
                                    theme === value
                                        ? "bg-accent text-accent-fg"
                                        : "text-muted hover:text-fg",
                                )}
                            >
                                <Icon className="size-3.5" />
                                {t(key)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Label className="mb-0 flex items-center gap-1.5">
                        <Languages className="size-3.5" />
                        {t("language")}
                    </Label>
                    <Select
                        className="h-9 w-auto py-0 text-xs"
                        value={params?.locale ?? routing.defaultLocale}
                        onChange={(event) => {
                            router.replace(pathname, { locale: event.target.value as AppLocale });
                        }}
                    >
                        <option value="id">Bahasa Indonesia</option>
                        <option value="en">English</option>
                    </Select>
                </div>
            </section>

            <section className="surface-card p-5">
                <h2 className="mb-1 text-sm font-bold">{t("learning")}</h2>
                <p className="mb-4 text-xs text-muted">{t("learningHint")}</p>
                <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/60 p-3">
                    <input
                        type="checkbox"
                        checked={shuffleCards}
                        onChange={(event) => setShuffleCards(event.target.checked)}
                        className="mt-0.5 accent-[var(--accent)]"
                    />
                    <span>
                        <span className="block text-xs font-semibold">{t("shuffleCards")}</span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                            {t("shuffleCardsHint")}
                        </span>
                    </span>
                </label>
            </section>

            <section className="surface-card p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
                    <Volume2 className="size-4 text-muted" />
                    {t("audio")}
                </h2>
                {germanVoices.length === 0 ? (
                    <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                        {t("ttsNoVoice")}
                    </p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="tts-voice">{t("ttsVoice")}</Label>
                            <Select
                                id="tts-voice"
                                value={ttsVoiceURI}
                                onChange={(event) => setTtsVoiceURI(event.target.value)}
                            >
                                <option value="">{t("ttsAuto")}</option>
                                {germanVoices.map((voice) => (
                                    <option key={voice.voiceURI} value={voice.voiceURI}>
                                        {voice.name} ({voice.lang})
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="tts-rate">
                                {t("ttsRate")} · {ttsRate.toFixed(1)}×
                            </Label>
                            <input
                                id="tts-rate"
                                type="range"
                                min={0.5}
                                max={1.6}
                                step={0.1}
                                value={ttsRate}
                                onChange={(event) => setTtsRate(Number(event.target.value))}
                                className="mt-2 w-full accent-[var(--accent)]"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="mt-2"
                                onClick={() =>
                                    speak("Guten Tag! Ich lerne Deutsch.", {
                                        voiceURI: ttsVoiceURI || null,
                                        rate: ttsRate,
                                    })
                                }
                            >
                                <Volume2 className="size-3.5" />
                                Test
                            </Button>
                        </div>
                    </div>
                )}
            </section>

            <section className="surface-card p-5">
                <h2 className="mb-3 text-sm font-bold">{t("data")}</h2>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleExportJson}
                        loading={busy === "json"}
                    >
                        <FileJson className="size-3.5" />
                        {t("exportJson")}
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleExportCsv}
                        loading={busy === "csv"}
                    >
                        <Download className="size-3.5" />
                        {t("exportCsv")}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger"
                        onClick={() => setConfirmWipe(true)}
                    >
                        <Trash2 className="size-3.5" />
                        {t("deleteAccount")}
                    </Button>
                </div>
            </section>

            <section className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                    <h2 className="text-sm font-bold">
                        {user ? t("account") : t("guestTitle")}
                    </h2>
                    <p className="max-w-md text-xs text-muted">
                        {user ? user.email : t("guestBody")}
                    </p>
                    {!user ? (
                        <Link
                            href="/signup"
                            className={buttonStyles({
                                size: "sm",
                                variant: "secondary",
                                className: "mt-3",
                            })}
                        >
                            <LogIn className="size-3.5" />
                            {t("guestCta")}
                        </Link>
                    ) : null}
                </div>
                <div className="flex items-center gap-3">
                    {saved ? (
                        <span className="text-xs font-semibold text-success">{t("saved")}</span>
                    ) : null}
                    {error ? <span className="text-xs text-danger">{error}</span> : null}
                    <Button onClick={handleSave} loading={saving}>
                        {tc("save")}
                    </Button>
                </div>
            </section>

            <Dialog
                open={confirmWipe}
                onClose={() => setConfirmWipe(false)}
                title={t("deleteAccount")}
                description={t("deleteAccountBody")}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setConfirmWipe(false)}>
                            {tc("cancel")}
                        </Button>
                        <Button variant="danger" onClick={handleWipe} loading={busy === "wipe"}>
                            {tc("delete")}
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-muted">{user?.email ?? t("guestTitle")}</p>
            </Dialog>
        </div>
    );
}
