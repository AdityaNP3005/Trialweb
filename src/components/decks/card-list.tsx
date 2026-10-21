"use client";

import { useTranslations } from "next-intl";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import type { Card } from "@/types";
import { Badge } from "@/components/ui/badge";

export function CardList({
    cards,
    onEdit,
    onDelete,
    onToggleSuspend,
    readOnly = false,
}: {
    cards: Card[];
    onEdit: (card: Card) => void;
    onDelete: (card: Card) => void;
    onToggleSuspend: (card: Card) => void;
    readOnly?: boolean;
}) {
    const t = useTranslations("decks");
    const tc = useTranslations("common");

    return (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {cards.map((card) => (
                <li
                    key={card.id}
                    className="group flex items-start gap-3 px-4 py-3 transition hover:bg-surface-2/60"
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="font-semibold">{card.front}</span>
                            {card.gender ? (
                                <Badge tone="neutral" className="normal-case">
                                    {card.gender}
                                </Badge>
                            ) : null}
                            {card.plural ? (
                                <span className="text-xs text-muted">pl. {card.plural}</span>
                            ) : null}
                            {card.ipa ? (
                                <span className="font-mono text-[11px] text-muted">{card.ipa}</span>
                            ) : null}
                            {card.suspended ? (
                                <Badge tone="warning" className="normal-case">
                                    {t("suspend")}
                                </Badge>
                            ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted">
                            {card.meaningId} · {card.meaningEn}
                        </p>
                        {card.exampleDe ? (
                            <p className="mt-1 truncate text-xs italic text-muted">
                                „{card.exampleDe}“
                            </p>
                        ) : null}
                    </div>

                    {readOnly ? null : (
                        <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition group-hover:opacity-100">
                            <button
                                type="button"
                                onClick={() => onToggleSuspend(card)}
                                title={card.suspended ? t("unsuspend") : t("suspend")}
                                aria-label={card.suspended ? t("unsuspend") : t("suspend")}
                                className="rounded-lg p-1.5 text-muted transition hover:bg-surface hover:text-fg"
                            >
                                {card.suspended ? (
                                    <Eye className="size-3.5" />
                                ) : (
                                    <EyeOff className="size-3.5" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => onEdit(card)}
                                title={t("editCard")}
                                aria-label={t("editCard")}
                                className="rounded-lg p-1.5 text-muted transition hover:bg-surface hover:text-fg"
                            >
                                <Pencil className="size-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete(card)}
                                title={tc("delete")}
                                aria-label={tc("delete")}
                                className="rounded-lg p-1.5 text-muted transition hover:bg-surface hover:text-danger"
                            >
                                <Trash2 className="size-3.5" />
                            </button>
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
}
