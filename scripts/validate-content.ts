import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cardInputSchema } from "../src/lib/validation/schemas.ts";

/**
 * Validates every bundled deck:
 * - schema (zod) and noun/article rules,
 * - duplicates inside one file and across levels ("tidak redundan"),
 * - card counts vs. `src/content/manifest.json`,
 * - example sentence coverage per level.
 */

type ManifestDeck = {
    id: string;
    file: string;
    level: string;
    name: string;
    cardCount: number;
};

type Manifest = { courseId: string; decks: ManifestDeck[] };

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const contentRoot = join(projectRoot, "src", "content");
const manifest = JSON.parse(
    readFileSync(join(contentRoot, "manifest.json"), "utf8"),
) as Manifest;

const ARTICLELESS_NOUNS = new Set([
    "montag",
    "dienstag",
    "mittwoch",
    "donnerstag",
    "freitag",
    "samstag",
    "sonntag",
]);

const problems: string[] = [];
const warnings: string[] = [];
const allFronts = new Map<string, string>();
let totalCards = 0;

function normalize(front: string): string {
    return front
        .toLowerCase()
        .replace(/^(der|die|das)\s+/, "")
        .replace(/[.,!?;:]+$/g, "")
        .trim();
}

for (const deck of manifest.decks) {
    const path = join(contentRoot, manifest.courseId, deck.file);
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
        courseId: string;
        deck: { name: string; level: string; tags: string[] };
        cards: Record<string, unknown>[];
    };

    if (parsed.courseId !== manifest.courseId) {
        problems.push(`${deck.file}: courseId "${parsed.courseId}" tidak cocok dengan manifest`);
    }
    if (parsed.deck.level !== deck.level) {
        problems.push(
            `${deck.file}: level deck "${parsed.deck.level}" ≠ manifest "${deck.level}"`,
        );
    }
    if (parsed.cards.length !== deck.cardCount) {
        problems.push(
            `${deck.file}: manifest menyebut ${deck.cardCount} kartu, file berisi ${parsed.cards.length}`,
        );
    }

    let missingExamples = 0;
    let missingGender = 0;
    const seenHere = new Set<string>();

    parsed.cards.forEach((card, index) => {
        const result = cardInputSchema.safeParse({
            ...card,
            deckId: deck.id,
            courseId: parsed.courseId,
            source: "seed",
        });

        if (!result.success) {
            for (const issue of result.error.issues) {
                problems.push(
                    `${deck.file} #${index + 1} (${String(card.front ?? "?")}): ${issue.path.join(".")} — ${issue.message}`,
                );
            }
            return;
        }

        const data = result.data;
        const key = `${data.wordType}:${normalize(data.front)}`;

        if (seenHere.has(key)) {
            problems.push(`${deck.file}: duplikat "${data.front}" (#${index + 1})`);
        }
        seenHere.add(key);

        const previous = allFronts.get(key);
        if (previous && previous !== deck.id) {
            problems.push(
                `${data.front}: muncul di ${previous} dan ${deck.id} (harus hanya di level terendah)`,
            );
        } else if (!previous) {
            allFronts.set(key, deck.id);
        }

        if (
            data.wordType === "noun" &&
            !data.gender &&
            !/^(der|die|das)\s/i.test(data.front) &&
            !ARTICLELESS_NOUNS.has(data.front.toLowerCase())
        ) {
            missingGender += 1;
        }

        if (data.level !== deck.level) {
            problems.push(
                `${deck.file} #${index + 1} (${data.front}): level kartu ${data.level} ≠ ${deck.level}`,
            );
        }

        if (!data.exampleDe) missingExamples += 1;
    });

    totalCards += parsed.cards.length;
    const coverage = ((parsed.cards.length - missingExamples) / parsed.cards.length) * 100;
    console.log(
        `${deck.id.padEnd(14)} ${String(parsed.cards.length).padStart(5)} kartu · contoh ${coverage.toFixed(0)}% · unik ${seenHere.size}`,
    );
    if (missingGender > 0) {
        warnings.push(`${deck.id}: ${missingGender} noun tanpa gender (artikel belum tersedia dari sumber)`);
    }
    if (missingExamples > 0) {
        warnings.push(`${deck.id}: ${missingExamples} kartu tanpa contoh kalimat`);
    }
}

console.log(`\nTotal ${totalCards} kartu di ${manifest.decks.length} deck.`);

if (warnings.length > 0) {
    console.log(`\nPeringatan kualitas (${warnings.length}):`);
    for (const warning of warnings) console.log(`- ${warning}`);
}

if (problems.length > 0) {
    console.error(`\n${problems.length} masalah:`);
    for (const problem of problems.slice(0, 80)) console.error(`- ${problem}`);
    process.exitCode = 1;
} else {
    console.log("Tidak ada masalah. Konten siap dipakai.");
}
