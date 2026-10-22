"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    Play,
    Plus,
    RotateCcw,
    Search,
    Trash2,
    Upload,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Card, Deck, DeckProgress } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { getCourse } from "@/content/courses";
import { sectionLabelFor, unitLabelFor } from "@/lib/content/labels";
import { Button, buttonStyles } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { Progress, Skeleton } from "@/components/ui/progress";
import { CardList } from "@/components/decks/card-list";
import { CardFormDialog } from "@/components/decks/card-form";
import { CsvImportDialog } from "@/components/import/csv-import-dialog";

export default function DeckDetailPage() {
    const params = useParams<{ deckId: string }>();
    const deckId = params?.deckId ?? "";
    const router = useRouter();
    const { store } = useStore();
    const t = useTranslations("decks");
    const tc = useTranslations("common");
    const locale = useLocale();

    const [deck, setDeck] = useState<Deck | null>(null);
    const [cards, setCards] = useState<Card[] | null>(null);
    const [counts, setCounts] = useState<DeckProgress | null>(null);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Card | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!store || !deckId) return;
        try {
            const [nextDeck, nextCards, nextCounts] = await Promise.all([
                store.getDeck(deckId),
                store.listCards(deckId),
                store.getDeckProgress(deckId),
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
            [card.front, card.meaningId, card.meaningEn, card.ipa ?? "", card.readingId ?? ""]
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
            <div className="panel p-6">
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
        <div className="space-y-6">
            <div className="border-b border-border pb-5">
                <Link
                    href="/decks"
                    className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-fg"
                >
                    <ArrowLeft className="size-3.5" />
                    {tc("back")}
                </Link>

                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                    <div className="min-w-0">
                        <p className="eyebrow">
                            {sectionLabelFor(
                                deck.level,
                                getCourse(deck.courseId).unitNoun,
                                tc,
                            )}{" "}
                            · {deck.readOnly ? t("badgeContent") : t("badgeCustom")}
                        </p>
                        <h1 className="display mt-1.5 text-3xl leading-tight">
                            {unitLabelFor(
                                deck.topicOrder,
                                deck.name,
                                getCourse(deck.courseId).unitNoun,
                                tc,
                                locale,
                            )}
                        </h1>
                        {deck.description ? (
                            <p className="mt-1.5 max-w-2xl text-sm text-muted">
                                {deck.description}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/study/${deck.id}`} className={buttonStyles({ size: "sm" })}>
                            <Play className="size-3.5" />
                            {t("study")}
                        </Link>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                if (!window.confirm(t("resetCycleBody"))) return;
                                void store?.resetDeckCycle(deck.id).then(load);
                            }}
                            aria-label={t("resetCycle")}
                            title={t("resetCycle")}
                        >
                            <RotateCcw className="size-3.5" />
                        </Button>
                        {deck.readOnly ? null : (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDelete(true)}
                                aria-label={t("deleteDeck")}
                            >
                                <Trash2 className="size-3.5 text-danger" />
                            </Button>
                        )}
                    </div>
                </div>

                <dl className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                    <dt className="eyebrow">{t("cardCount", { count: deck.cardCount })}</dt>
                    <dt className="eyebrow">{t("cycleLabel", { cycle: counts?.cycle ?? 1 })}</dt>
                    <dd className="num text-sm font-semibold">
                        {t("knownProgress", {
                            known: counts?.known ?? 0,
                            total: deck.cardCount,
                        })}
                    </dd>
                    {counts?.pending ? (
                        <dd className="num text-sm font-semibold text-warning">
                            {t("pendingCount", { count: counts.pending })}
                        </dd>
                    ) : null}
                </dl>

                <Progress value={counts?.percent ?? 0} className="mt-3 max-w-md" />
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
                    disabled={deck.readOnly}
                >
                    <Plus className="size-3.5" />
                    {t("addCard")}
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setImportOpen(true)}
                    disabled={deck.readOnly}
                >
                    <Upload className="size-3.5" />
                    CSV
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
                    readOnly={deck.readOnly}
                    onEdit={(card) => {
                        setSelected(card);
                        setFormOpen(true);
                    }}
                    onDelete={handleDeleteCard}
                    onToggleSuspend={handleToggleSuspend}
                />
            )}

            <p className="meta">{t("cardCount", { count: filtered.length })}</p>

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
                <p className="text-sm text-muted">
                    {unitLabelFor(
                        deck.topicOrder,
                        deck.name,
                        getCourse(deck.courseId).unitNoun,
                        tc,
                        locale,
                    )}
                </p>
            </Dialog>
        </div>
    );
}
