"use client";

import { useTranslations } from "next-intl";
import { FrontText } from "@/components/study/front-text";
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
        <ul className="border-t border-border">
            {cards.map((card) => (
                <li
                    key={card.id}
                    className="group flex items-start gap-3 border-b border-border px-1 py-3 transition-colors hover:bg-surface-2/40"
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span
                                className={
                                    card.script === "hanzi"
                                        ? "font-cjk text-base font-medium"
                                        : "font-semibold"
                                }
                            >
                                <FrontText card={card} />
                            </span>
                            {card.pinyin ? (
                                <span className="font-mono text-[11px] text-accent">
                                    {card.pinyin}
                                </span>
                            ) : null}
                            {card.plural ? (
                                <span className="meta">pl. {card.plural}</span>
                            ) : null}
                            {card.readingId || card.ipa ? (
                                <span className="meta">{card.readingId ?? card.ipa}</span>
                            ) : null}
                            {card.suspended ? (
                                <Badge tone="warning">{t("suspend")}</Badge>
                            ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted">
                            {card.meaningId} · {card.meaningEn}
                        </p>
                        {card.exampleDe ? (
                            <p className="mt-1 truncate border-l-2 border-border pl-2 text-xs italic text-muted">
                                „{card.exampleDe}“
                            </p>
                        ) : null}
                    </div>

                    {readOnly ? null : (
                        <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                            <button
                                type="button"
                                onClick={() => onToggleSuspend(card)}
                                title={card.suspended ? t("unsuspend") : t("suspend")}
                                aria-label={card.suspended ? t("unsuspend") : t("suspend")}
                                className="rounded-[0.25rem] p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
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
                                className="rounded-[0.25rem] p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                            >
                                <Pencil className="size-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete(card)}
                                title={tc("delete")}
                                aria-label={tc("delete")}
                                className="rounded-[0.25rem] p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-danger"
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
