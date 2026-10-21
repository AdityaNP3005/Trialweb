"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    Plus,
    Search,
    Sparkles,
    Trash2,
    Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Card, Deck, DeckCounts } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/progress";
import { CardList } from "@/components/decks/card-list";
import { CardFormDialog } from "@/components/decks/card-form";
import { CsvImportDialog } from "@/components/import/csv-import-dialog";
import { AiGenerateDialog } from "@/components/ai/ai-generate-dialog";

export default function DeckDetailPage() {
    const params = useParams<{ deckId: string }>();
    const deckId = params?.deckId ?? "";
    const router = useRouter();
    const { store } = useStore();
    const t = useTranslations("decks");
    const tc = useTranslations("common");

    const [deck, setDeck] = useState<Deck | null>(null);
    const [cards, setCards] = useState<Card[] | null>(null);
    const [counts, setCounts] = useState<DeckCounts | null>(null);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Card | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!store || !deckId) return;
        try {
            const [nextDeck, nextCards, nextCounts] = await Promise.all([
                store.getDeck(deckId),
                store.listCards(deckId),
                store.getDeckCounts(deckId),
            ]);
            setDeck(nextDeck);
            setCards(nextCards);
            setCounts(nextCounts);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "error");
        }
    }, [store, deckId]);

    useEffect(() => {
        void load();
    }, [load]);

    const filtered = useMemo(() => {
        if (!cards) return [];
        const term = search.trim().toLowerCase();
        if (!term) return cards;
        return cards.filter((card) =>
            [card.front, card.meaningId, card.meaningEn, card.ipa ?? ""]
                .join(" ")
                .toLowerCase()
                .includes(term),
        );
    }, [cards, search]);

    async function handleDeleteCard(card: Card) {
        if (!store) return;
        if (!window.confirm(tc("confirmDelete"))) return;
        await store.deleteCard(card);
        await load();
    }

    async function handleToggleSuspend(card: Card) {
        if (!store) return;
        await store.setCardSuspended(card.id, !card.suspended);
        await load();
    }

    async function handleDeleteDeck() {
        if (!store || !deck) return;
        await store.deleteDeck(deck.id);
        router.replace("/decks");
    }

    if (!deck && !error) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (error || !deck) {
        return (
            <div className="surface-card p-6">
                <p className="text-sm text-danger">{error ?? t("emptyTitle")}</p>
                <Link
                    href="/decks"
                    className={buttonStyles({ variant: "ghost", size: "sm", className: "mt-3" })}
                >
                    <ArrowLeft className="size-3.5" />
                    {tc("back")}
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <Link
                    href="/decks"
                    className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-fg"
                >
                    <ArrowLeft className="size-3.5" />
                    {tc("back")}
                </Link>

                <div className="surface-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-extrabold tracking-tight">{deck.name}</h1>
                                <Badge tone="accent">{deck.level}</Badge>
                                {deck.source === "seed" ? <Badge tone="neutral">seed</Badge> : null}
                            </div>
                            {deck.description ? (
                                <p className="mt-1 text-sm text-muted">{deck.description}</p>
                            ) : null}
                            <p className="mt-2 text-xs text-muted">
                                {t("cardCount", { count: deck.cardCount })} ·{" "}
                                {t("due", { count: counts?.due ?? 0 })} ·{" "}
                                {t("new", { count: counts?.new ?? 0 })}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/study/${deck.id}`} className={buttonStyles({ size: "sm" })}>
                                <Sparkles className="size-3.5" />
                                {t("study")}
                            </Link>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDelete(true)}
                                aria-label={t("deleteDeck")}
                            >
                                <Trash2 className="size-3.5 text-danger" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-48 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t("searchCards")}
                        className="pl-9"
                    />
                </div>
                <Button
                    size="sm"
                    onClick={() => {
                        setSelected(null);
                        setFormOpen(true);
                    }}
                >
                    <Plus className="size-3.5" />
                    {t("addCard")}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
                    <Upload className="size-3.5" />
                    CSV
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setAiOpen(true)}>
                    <Sparkles className="size-3.5" />
                    AI
                </Button>
            </div>

            {!cards ? (
                <Skeleton className="h-64" />
            ) : filtered.length === 0 ? (
                <EmptyState
                    title={search ? tc("empty") : t("noCards")}
                    body={search ? undefined : t("emptyBody")}
                    action={
                        search ? undefined : (
                            <Button
                                size="sm"
                                onClick={() => {
                                    setSelected(null);
                                    setFormOpen(true);
                                }}
                            >
                                <Plus className="size-3.5" />
                                {t("addCard")}
                            </Button>
                        )
                    }
                />
            ) : (
                <CardList
                    cards={filtered}
                    onEdit={(card) => {
                        setSelected(card);
                        setFormOpen(true);
                    }}
                    onDelete={handleDeleteCard}
                    onToggleSuspend={handleToggleSuspend}
                />
            )}

            <p className="text-xs text-muted">{t("cardCount", { count: filtered.length })}</p>

            <CardFormDialog
                open={formOpen}
                onClose={() => setFormOpen(false)}
                deckId={deck.id}
                courseId={deck.courseId}
                card={selected}
                onSaved={load}
            />

            <CsvImportDialog
                open={importOpen}
                onClose={() => setImportOpen(false)}
                deckId={deck.id}
                courseId={deck.courseId}
                level={deck.level}
                existingFronts={
                    new Set((cards ?? []).map((card) => card.front.toLowerCase()))
                }
                onImported={load}
            />

            <AiGenerateDialog
                open={aiOpen}
                onClose={() => setAiOpen(false)}
                deckId={deck.id}
                courseId={deck.courseId}
                level={deck.level}
                onImported={load}
            />

            <Dialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                title={t("deleteDeck")}
                description={t("deleteDeckBody")}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                            {tc("cancel")}
                        </Button>
                        <Button variant="danger" onClick={handleDeleteDeck}>
                            {tc("delete")}
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-muted">{deck.name}</p>
            </Dialog>
        </div>
    );
}
