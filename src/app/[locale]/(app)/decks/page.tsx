"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStore } from "@/components/providers/store-provider";
import type { CefrLevel, Deck } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/progress";
import { DeckCard } from "@/components/decks/deck-card";

const levels: (CefrLevel | "all")[] = ["all", "A1", "A2", "B1"];

export default function DecksPage() {
    const { store } = useStore();
    const t = useTranslations("decks");
    const tc = useTranslations("common");

    const [decks, setDecks] = useState<Deck[] | null>(null);
    const [level, setLevel] = useState<CefrLevel | "all">("all");
    const [tag, setTag] = useState("all");
    const [source, setSource] = useState<"all" | "seed" | "user">("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "",
        description: "",
        level: "A1" as CefrLevel,
        tags: "",
        newPerDay: 10,
    });

    useEffect(() => {
        if (!store) return;
        let cancelled = false;
        (async () => {
            try {
                const next = await store.listDecks();
                if (!cancelled) setDecks(next);
            } catch (cause) {
                if (!cancelled) setError(cause instanceof Error ? cause.message : "error");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [store]);

    const tags = useMemo(() => {
        const set = new Set<string>();
        decks?.forEach((deck) => deck.tags.forEach((entry) => set.add(entry)));
        return [...set].sort();
    }, [decks]);

    const filtered = useMemo(() => {
        return (decks ?? []).filter((deck) => {
            if (level !== "all" && deck.level !== level) return false;
            if (tag !== "all" && !deck.tags.includes(tag)) return false;
            if (source !== "all" && deck.source !== source) return false;
            return true;
        });
    }, [decks, level, tag, source]);

    async function handleCreate(event: React.FormEvent) {
        event.preventDefault();
        if (!store || !form.name.trim()) return;
        setSaving(true);
        setError(null);
        try {
            await store.createDeck({
                name: form.name,
                description: form.description,
                level: form.level,
                tags: form.tags
                    .split(",")
                    .map((entry) => entry.trim())
                    .filter(Boolean),
                newPerDay: form.newPerDay,
            });
            setDecks(await store.listDecks());
            setDialogOpen(false);
            setForm({ name: "", description: "", level: "A1", tags: "", newPerDay: 10 });
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "error");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
                    <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="size-4" />
                    {t("newDeck")}
                </Button>
            </div>

            <div className="surface-card flex flex-wrap items-center gap-2 p-3">
                <span className="flex items-center gap-1.5 pl-1 text-xs font-semibold text-muted">
                    <Filter className="size-3.5" />
                    {t("filterLevel")}
                </span>
                <div className="flex flex-wrap gap-1">
                    {levels.map((entry) => (
                        <button
                            key={entry}
                            type="button"
                            onClick={() => setLevel(entry)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${level === entry
                                    ? "bg-accent text-accent-fg"
                                    : "bg-surface-2 text-muted hover:text-fg"
                                }`}
                        >
                            {entry === "all" ? tc("all") : entry}
                        </button>
                    ))}
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Select
                        aria-label={t("filterTag")}
                        value={tag}
                        onChange={(event) => setTag(event.target.value)}
                        className="h-9 w-auto py-0 text-xs"
                    >
                        <option value="all">
                            {t("filterTag")}: {tc("all")}
                        </option>
                        {tags.map((entry) => (
                            <option key={entry} value={entry}>
                                #{entry}
                            </option>
                        ))}
                    </Select>
                    <Select
                        aria-label={t("filterSource")}
                        value={source}
                        onChange={(event) =>
                            setSource(event.target.value as "all" | "seed" | "user")
                        }
                        className="h-9 w-auto py-0 text-xs"
                    >
                        <option value="all">{tc("all")}</option>
                        <option value="seed">seed</option>
                        <option value="user">user</option>
                    </Select>
                </div>
            </div>

            {error ? (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
            ) : null}

            {!decks ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-36" />
                    <Skeleton className="h-36" />
                    <Skeleton className="h-36" />
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    title={t("emptyTitle")}
                    body={t("emptyBody")}
                    action={
                        <Button onClick={() => setDialogOpen(true)} size="sm">
                            <Plus className="size-3.5" />
                            {t("newDeck")}
                        </Button>
                    }
                />
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((deck) => (
                        <DeckCard key={deck.id} deck={deck} />
                    ))}
                </div>
            )}

            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title={t("newDeck")}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                            {tc("cancel")}
                        </Button>
                        <Button form="new-deck-form" type="submit" loading={saving}>
                            {tc("create")}
                        </Button>
                    </>
                }
            >
                <form id="new-deck-form" onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <Label htmlFor="deck-name">{t("name")}</Label>
                        <Input
                            id="deck-name"
                            required
                            autoFocus
                            value={form.name}
                            onChange={(event) => setForm({ ...form, name: event.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="deck-description">{t("description")}</Label>
                        <Textarea
                            id="deck-description"
                            value={form.description}
                            onChange={(event) =>
                                setForm({ ...form, description: event.target.value })
                            }
                            className="min-h-16"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="deck-level">{t("level")}</Label>
                            <Select
                                id="deck-level"
                                value={form.level}
                                onChange={(event) =>
                                    setForm({ ...form, level: event.target.value as CefrLevel })
                                }
                            >
                                <option value="A1">A1</option>
                                <option value="A2">A2</option>
                                <option value="B1">B1</option>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="deck-new">New / day</Label>
                            <Input
                                id="deck-new"
                                type="number"
                                min={0}
                                max={200}
                                value={form.newPerDay}
                                onChange={(event) =>
                                    setForm({ ...form, newPerDay: Number(event.target.value) })
                                }
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="deck-tags">{t("tags")}</Label>
                        <Input
                            id="deck-tags"
                            placeholder={t("tagsHint")}
                            value={form.tags}
                            onChange={(event) => setForm({ ...form, tags: event.target.value })}
                        />
                    </div>
                </form>
            </Dialog>
        </div>
    );
}
