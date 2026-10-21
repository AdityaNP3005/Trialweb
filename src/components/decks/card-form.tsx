"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Card, CardInput, CefrLevel, Gender, SectionId, WordType } from "@/types";
import { cardInputSchema, splitGermanArticle } from "@/lib/validation/schemas";
import { useStore } from "@/components/providers/store-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";

const wordTypes: WordType[] = [
    "noun",
    "verb",
    "adjective",
    "adverb",
    "phrase",
    "number",
    "other",
];

type FormState = {
    front: string;
    meaningId: string;
    meaningEn: string;
    gender: Gender | "";
    wordType: WordType;
    plural: string;
    ipa: string;
    exampleDe: string;
    exampleId: string;
    exampleEn: string;
    tags: string;
    level: SectionId;
};

function toForm(card: Card | null): FormState {
    return {
        front: card?.front ?? "",
        meaningId: card?.meaningId ?? "",
        meaningEn: card?.meaningEn ?? "",
        gender: card?.gender ?? "",
        wordType: card?.wordType ?? "noun",
        plural: card?.plural ?? "",
        ipa: card?.ipa ?? "",
        exampleDe: card?.exampleDe ?? "",
        exampleId: card?.exampleId ?? "",
        exampleEn: card?.exampleEn ?? "",
        tags: card?.tags.join(", ") ?? "",
        level: card?.level ?? "A1",
    };
}

const nullify = (value: string) => (value.trim() ? value.trim() : null);

export function CardFormDialog({
    open,
    onClose,
    deckId,
    courseId,
    card,
    onSaved,
}: {
    open: boolean;
    onClose: () => void;
    deckId: string;
    courseId: string;
    card: Card | null;
    onSaved: () => void;
}) {
    const { store } = useStore();
    const t = useTranslations("decks");
    const tc = useTranslations("common");
    const te = useTranslations("errors");

    const [form, setForm] = useState<FormState>(() => toForm(card));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setForm(toForm(card));
            setError(null);
        }
    }, [open, card]);

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((current) => ({ ...current, [key]: value }));

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!store) return;

        const payload: CardInput = {
            deckId,
            courseId,
            front: form.front.trim(),
            meaningId: form.meaningId.trim(),
            meaningEn: form.meaningEn.trim(),
            gender:
                form.gender === ""
                    ? splitGermanArticle(form.front.trim()).gender
                    : form.gender,
            wordType: form.wordType,
            plural: nullify(form.plural),
            ipa: nullify(form.ipa),
            exampleDe: nullify(form.exampleDe),
            exampleId: nullify(form.exampleId),
            exampleEn: nullify(form.exampleEn),
            tags: form.tags
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
            level: form.level,
            source: card?.source ?? "user",
        };

        const parsed = cardInputSchema.safeParse(payload);
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? te("required"));
            return;
        }

        setSaving(true);
        setError(null);
        try {
            if (card) {
                await store.updateCard(card.id, parsed.data);
            } else {
                await store.createCard(parsed.data);
            }
            onSaved();
            onClose();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : te("unknown"));
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title={card ? t("editCard") : t("addCard")}
            footer={
                <>
                    <Button variant="ghost" type="button" onClick={onClose}>
                        {tc("cancel")}
                    </Button>
                    <Button type="submit" form="card-form" loading={saving}>
                        {tc("save")}
                    </Button>
                </>
            }
        >
            <form id="card-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="card-front">{t("front")}</Label>
                    <Input
                        id="card-front"
                        required
                        autoFocus
                        value={form.front}
                        onChange={(event) => set("front", event.target.value)}
                        placeholder="der Apfel"
                    />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="card-meaning-id">{t("meaningId")}</Label>
                        <Input
                            id="card-meaning-id"
                            required
                            value={form.meaningId}
                            onChange={(event) => set("meaningId", event.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="card-meaning-en">{t("meaningEn")}</Label>
                        <Input
                            id="card-meaning-en"
                            required
                            value={form.meaningEn}
                            onChange={(event) => set("meaningEn", event.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <Label htmlFor="card-gender">{t("gender")}</Label>
                        <Select
                            id="card-gender"
                            value={form.gender}
                            onChange={(event) => set("gender", event.target.value as Gender | "")}
                        >
                            <option value="">—</option>
                            <option value="der">der</option>
                            <option value="die">die</option>
                            <option value="das">das</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="card-type">{t("wordType")}</Label>
                        <Select
                            id="card-type"
                            value={form.wordType}
                            onChange={(event) => set("wordType", event.target.value as WordType)}
                        >
                            {wordTypes.map((entry) => (
                                <option key={entry} value={entry}>
                                    {entry}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="card-level">{t("level")}</Label>
                        <Select
                            id="card-level"
                            value={form.level}
                            onChange={(event) => set("level", event.target.value as CefrLevel)}
                        >
                            <option value="A1">A1</option>
                            <option value="A2">A2</option>
                            <option value="B1">B1</option>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="card-plural">{t("plural")}</Label>
                        <Input
                            id="card-plural"
                            value={form.plural}
                            onChange={(event) => set("plural", event.target.value)}
                            placeholder="die Äpfel"
                        />
                    </div>
                    <div>
                        <Label htmlFor="card-ipa">{t("ipa")}</Label>
                        <Input
                            id="card-ipa"
                            value={form.ipa}
                            onChange={(event) => set("ipa", event.target.value)}
                            placeholder="[ˈapfl̩]"
                            className="font-mono"
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="card-example-de">{t("exampleDe")}</Label>
                    <Input
                        id="card-example-de"
                        value={form.exampleDe}
                        onChange={(event) => set("exampleDe", event.target.value)}
                    />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="card-example-id">{t("exampleId")}</Label>
                        <Input
                            id="card-example-id"
                            value={form.exampleId}
                            onChange={(event) => set("exampleId", event.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="card-example-en">{t("exampleEn")}</Label>
                        <Input
                            id="card-example-en"
                            value={form.exampleEn}
                            onChange={(event) => set("exampleEn", event.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="card-tags">{t("tags")}</Label>
                    <Input
                        id="card-tags"
                        value={form.tags}
                        onChange={(event) => set("tags", event.target.value)}
                        placeholder={t("tagsHint")}
                    />
                </div>

                {error ? (
                    <p role="alert" className="border-l-2 border-danger pl-3 text-xs text-danger">
                        {error}
                    </p>
                ) : null}
            </form>
        </Dialog>
    );
}
