"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStore } from "@/components/providers/store-provider";
import type { CefrLevel, Deck, DeckProgress, SectionId } from "@/types";
import { CEFR_LEVELS } from "@/types";
import { courseSections, summarizeSection } from "@/content/courses";
import { CourseSwitcher } from "@/components/courses/course-switcher";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/progress";
import { DeckCard } from "@/components/decks/deck-card";

export default function DecksPage() {
    const { store, profile, refreshProfile } = useStore();
    const t = useTranslations("decks");
    const tc = useTranslations("common");

    const activeCourseId = profile?.activeCourseId ?? "de";
    const sections = useMemo(
        () => courseSections(activeCourseId),
        [activeCourseId],
    );
    const levels: (SectionId | "all")[] = useMemo(
        () => ["all", ...sections.map((section) => section.id)],
        [sections],
    );

    const [decks, setDecks] = useState<Deck[] | null>(null);
    const [progress, setProgress] = useState<Record<string, DeckProgress>>({});
    const [level, setLevel] = useState<SectionId | "all">("all");
    const [tag, setTag] = useState("all");
    const [source, setSource] = useState<"all" | "content" | "user">("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [switching, setSwitching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "",
        description: "",
        level: "A1" as CefrLevel,
        tags: "",
    });

    useEffect(() => {
        if (!store) return;
        let cancelled = false;
        setDecks(null);
        (async () => {
            try {
                const [next, nextProgress] = await Promise.all([
                    store.listDecks(),
                    store.listDeckProgress(),
                ]);
                if (!cancelled) {
                    setDecks(next);
                    setProgress(
                        Object.fromEntries(nextProgress.map((entry) => [entry.deckId, entry])),
                    );
                }
            } catch (cause) {
                if (!cancelled) setError(cause instanceof Error ? cause.message : "error");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [store, activeCourseId]);

    async function switchCourse(courseId: string) {
        if (!store || courseId === activeCourseId) return;
        setSwitching(true);
        setLevel("all");
        setTag("all");
        try {
            await store.updateProfile({ activeCourseId: courseId });
            await refreshProfile();
        } finally {
            setSwitching(false);
        }
    }

    const tags = useMemo(() => {
        const set = new Set<string>();
        const sectionIds = new Set(sections.map((section) => section.id));
        decks?.forEach((deck) =>
            deck.tags
                // Only section tags are useful here; unit keys would flood the list.
                .filter((entry) => sectionIds.has(entry))
                .forEach((entry) => set.add(entry)),
        );
        return [...set];
    }, [decks, sections]);

    const filtered = useMemo(() => {
        return (decks ?? [])
            .filter((deck) => {
                if (level !== "all" && deck.level !== level) return false;
                if (tag !== "all" && !deck.tags.includes(tag)) return false;
                if (source !== "all" && deck.source !== source) return false;
                return true;
            })
            .sort((a, b) => {
                if (a.level !== b.level) {
                    const order = sections.map((section) => section.id);
                    const ai = order.indexOf(a.level);
                    const bi = order.indexOf(b.level);
                    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
                }
                return (a.topicOrder ?? 0) - (b.topicOrder ?? 0);
            });
    }, [decks, level, tag, source, sections]);

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
            });
            setDecks(await store.listDecks());
            setDialogOpen(false);
            setForm({ name: "", description: "", level: "A1", tags: "" });
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

            <CourseSwitcher
                activeCourseId={activeCourseId}
                disabled={switching}
                onSelect={switchCourse}
            />

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
                            setSource(event.target.value as "all" | "content" | "user")
                        }
                        className="h-9 w-auto py-0 text-xs"
                    >
                        <option value="all">{tc("all")}</option>
                        <option value="content">content</option>
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
            ) : level === "all" && source !== "user" ? (
                <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {sections.map((section) => {
                            const summary = summarizeSection(
                                section.id,
                                decks,
                                new Map(Object.entries(progress)),
                            );
                            return (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => setLevel(section.id)}
                                    className="surface-card flex flex-col gap-2 p-4 text-left transition hover:border-accent/50"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-extrabold">
                                            {section.label}
                                        </span>
                                        <span className="text-sm font-extrabold text-accent">
                                            {summary.percent}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted">
                                        {section.unitNoun === "book"
                                            ? t("bookChapters", { count: summary.topics })
                                            : t("bandTopics", { count: summary.topics })}
                                    </p>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                                        <div
                                            className="h-full rounded-full bg-accent"
                                            style={{ width: `${summary.percent}%` }}
                                        />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {decks.filter((deck) => deck.source === "user").length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {decks
                                .filter((deck) => deck.source === "user")
                                .map((deck) => (
                                    <DeckCard
                                        key={deck.id}
                                        deck={deck}
                                        progress={progress[deck.id]}
                                    />
                                ))}
                        </div>
                    ) : null}
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
                    {filtered.slice(0, 60).map((deck) => (
                        <DeckCard key={deck.id} deck={deck} progress={progress[deck.id]} />
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
                                {CEFR_LEVELS.map((entry) => (
                                    <option key={entry} value={entry}>
                                        {entry}
                                    </option>
                                ))}
                            </Select>
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
