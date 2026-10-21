"use client";

import { useMemo, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SectionId } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import {
    emptyMapping,
    guessMapping,
    mapRows,
    parseCsv,
    type ColumnMapping,
    type CsvTable,
} from "@/lib/import/csv";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/field";

const fields: {
    key: keyof ColumnMapping;
    label:
    | "columnFront"
    | "columnMeaningId"
    | "columnMeaningEn"
    | "columnTags"
    | "columnLevel"
    | "columnExample";
}[] = [
        { key: "front", label: "columnFront" },
        { key: "meaningId", label: "columnMeaningId" },
        { key: "meaningEn", label: "columnMeaningEn" },
        { key: "tags", label: "columnTags" },
        { key: "level", label: "columnLevel" },
        { key: "example", label: "columnExample" },
    ];

export function CsvImportDialog({
    open,
    onClose,
    deckId,
    courseId,
    level,
    existingFronts,
    onImported,
}: {
    open: boolean;
    onClose: () => void;
    deckId: string;
    courseId: string;
    level: SectionId;
    existingFronts: Set<string>;
    onImported: () => void;
}) {
    const { store } = useStore();
    const t = useTranslations("import");
    const tc = useTranslations("common");

    const [table, setTable] = useState<CsvTable | null>(null);
    const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(
        null,
    );
    const [done, setDone] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const mapped = useMemo(() => {
        if (!table) return null;
        return mapRows(table, mapping, { level, existingFronts });
    }, [table, mapping, level, existingFronts]);

    async function handleFile(file: File) {
        setError(null);
        setDone(null);
        const text = await file.text();
        const parsed = parseCsv(text);
        setTable(parsed);
        setMapping(guessMapping(parsed.headers));
    }

    async function handleImport() {
        if (!store || !mapped || mapped.cards.length === 0) return;
        setProgress({ done: 0, total: mapped.cards.length });
        setError(null);
        try {
            await store.bulkCreateCards(
                deckId,
                mapped.cards.map((card) => ({ ...card, deckId, courseId })),
                (doneCount, total) => setProgress({ done: doneCount, total }),
            );
            setDone(mapped.cards.length);
            onImported();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : tc("retry"));
        } finally {
            setProgress(null);
        }
    }

    function reset() {
        setTable(null);
        setMapping(emptyMapping);
        setDone(null);
        setError(null);
    }

    return (
        <Dialog
            open={open}
            onClose={() => {
                reset();
                onClose();
            }}
            title={t("title")}
            description={t("body")}
            footer={
                <>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            reset();
                            onClose();
                        }}
                    >
                        {tc("close")}
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!mapped || mapped.cards.length === 0 || progress !== null}
                        loading={progress !== null}
                    >
                        {progress
                            ? t("importing", { done: progress.done, total: progress.total })
                            : t("importButton", { count: mapped?.cards.length ?? 0 })}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                        className="sr-only"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void handleFile(file);
                        }}
                    />
                    <Button
                        variant="secondary"
                        type="button"
                        className="w-full"
                        onClick={() => inputRef.current?.click()}
                    >
                        <FileUp className="size-4" />
                        {t("chooseFile")}
                    </Button>
                </div>

                {table ? (
                    <>
                        <p className="text-xs text-muted">
                            {t("rowsDetected", { count: table.rows.length })}
                        </p>

                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-muted">
                                {t("mapColumns")}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {fields.map(({ key, label }) => (
                                    <div key={key}>
                                        <Label htmlFor={`csv-${key}`} className="mb-1 text-[11px]">
                                            {t(label)}
                                            {key === "front" || key === "meaningId" ? " *" : ""}
                                        </Label>
                                        <Select
                                            id={`csv-${key}`}
                                            value={mapping[key]}
                                            onChange={(event) =>
                                                setMapping({ ...mapping, [key]: event.target.value })
                                            }
                                            className="h-9 py-0 text-xs"
                                        >
                                            <option value="">{t("ignore")}</option>
                                            {table.headers.map((header) => (
                                                <option key={header} value={header}>
                                                    {header}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {mapped ? (
                            <div className="flex flex-wrap gap-3 text-xs">
                                <span className="font-semibold text-success">
                                    {t("importButton", { count: mapped.cards.length })}
                                </span>
                                {mapped.duplicates > 0 ? (
                                    <span className="text-warning">
                                        {t("duplicates", { count: mapped.duplicates })}
                                    </span>
                                ) : null}
                                {mapped.invalid > 0 ? (
                                    <span className="text-danger">
                                        {t("invalid", { count: mapped.invalid })}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}

                        {mapped && mapped.cards.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-surface-2 text-muted">
                                        <tr>
                                            <th className="px-3 py-2 font-semibold">front</th>
                                            <th className="px-3 py-2 font-semibold">ID</th>
                                            <th className="px-3 py-2 font-semibold">EN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mapped.cards.slice(0, 6).map((card, index) => (
                                            <tr
                                                key={`${card.front}-${index}`}
                                                className="border-t border-border"
                                            >
                                                <td className="px-3 py-1.5 font-medium">{card.front}</td>
                                                <td className="px-3 py-1.5 text-muted">{card.meaningId}</td>
                                                <td className="px-3 py-1.5 text-muted">{card.meaningEn}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </>
                ) : null}

                {done !== null ? (
                    <p className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
                        {t("success", { count: done })}
                    </p>
                ) : null}
                {error ? (
                    <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
                ) : null}
            </div>
        </Dialog>
    );
}
