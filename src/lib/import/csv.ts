import Papa from "papaparse";
import type { CardInput, SectionId } from "@/types";

export type CsvTable = {
    headers: string[];
    rows: Record<string, string>[];
};

export type ColumnMapping = {
    front: string;
    meaningId: string;
    meaningEn: string;
    tags: string;
    level: string;
    example: string;
};

export const emptyMapping: ColumnMapping = {
    front: "",
    meaningId: "",
    meaningEn: "",
    tags: "",
    level: "",
    example: "",
};

const GUESSES: Record<keyof ColumnMapping, string[]> = {
    front: ["front", "word", "german", "deutsch", "kata", "wort", "vorderseite"],
    meaningId: ["meaning_id", "arti", "indonesia", "id", "back", "rückseite"],
    meaningEn: ["meaning_en", "english", "inggris", "en"],
    tags: ["tags", "tag", "kategori"],
    level: ["level", "cefr", "niveau"],
    example: ["example", "beispiel", "contoh", "sentence"],
};

export function guessMapping(headers: string[]): ColumnMapping {
    const normalized = headers.map((header) => ({
        raw: header,
        key: header.trim().toLowerCase().replace(/[\s-]+/g, "_"),
    }));

    const pick = (candidates: string[]) =>
        normalized.find((entry) => candidates.includes(entry.key))?.raw ?? "";

    return {
        front: pick(GUESSES.front),
        meaningId: pick(GUESSES.meaningId),
        meaningEn: pick(GUESSES.meaningEn),
        tags: pick(GUESSES.tags),
        level: pick(GUESSES.level),
        example: pick(GUESSES.example),
    };
}

export function parseCsv(text: string): CsvTable {
    const cleaned = text
        .split(/\r?\n/)
        .filter((line) => !line.startsWith("#"))
        .join("\n");

    const result = Papa.parse<Record<string, string>>(cleaned, {
        header: true,
        skipEmptyLines: "greedy",
    });

    const headers = (result.meta.fields ?? []).map((header) => header.trim());
    const rows = (result.data ?? [])
        .filter((row) => Object.values(row).some((value) => (value ?? "").trim() !== ""));

    return { headers, rows };
}

export type MappedRows = {
    cards: Omit<CardInput, "deckId" | "courseId">[];
    invalid: number;
    duplicates: number;
};

export function mapRows(
    table: CsvTable,
    mapping: ColumnMapping,
    defaults: { level: SectionId; existingFronts: Set<string> },
): MappedRows {
    const seen = new Set(defaults.existingFronts);
    const cards: Omit<CardInput, "deckId" | "courseId">[] = [];
    let invalid = 0;
    let duplicates = 0;

    const valueOf = (row: Record<string, string>, column: string) =>
        column ? (row[column] ?? "").trim() : "";

    for (const row of table.rows) {
        const front = valueOf(row, mapping.front);
        const meaningId = valueOf(row, mapping.meaningId);
        const meaningEn = valueOf(row, mapping.meaningEn) || meaningId;

        if (!front || !meaningId) {
            invalid += 1;
            continue;
        }

        const key = front.toLowerCase();
        if (seen.has(key)) {
            duplicates += 1;
            continue;
        }
        seen.add(key);

        const levelValue = valueOf(row, mapping.level).toUpperCase();

        cards.push({
            front,
            meaningId,
            meaningEn,
            gender: null,
            wordType: "other",
            plural: null,
            ipa: null,
            exampleDe: valueOf(row, mapping.example) || null,
            exampleId: null,
            exampleEn: null,
            tags: valueOf(row, mapping.tags)
                .split(/[;|,]/)
                .map((tag) => tag.trim())
                .filter(Boolean),
            level:
                levelValue === "A2" || levelValue === "B1"
                    ? levelValue
                    : defaults.level,
            source: "import",
            suspended: false,
        });
    }

    return { cards, invalid, duplicates };
}

export function cardsToCsv(
    cards: { front: string; meaningId: string; meaningEn: string; tags: string[]; level: string }[],
): string {
    return Papa.unparse(
        cards.map((card) => ({
            front: card.front,
            meaning_id: card.meaningId,
            meaning_en: card.meaningEn,
            tags: card.tags.join(";"),
            level: card.level,
        })),
    );
}
