import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cardInputSchema } from "../src/lib/validation/schemas.ts";

/**
 * Validates every bundled topic deck:
 * - schema (zod) and noun/article rules,
 * - duplicates inside a topic and across bands/levels ("tidak redundan"),
 * - card counts and topic ids vs. `manifest.json`,
 * - one topic order per band, no empty topics.
 */

type ManifestTopic = {
    id: string;
    key: string;
    title: string;
    icon: string;
    order: number;
    cardCount: number;
};

type ManifestLevel = {
    level: string;
    order: number;
    file: string;
    topics: ManifestTopic[];
};

type Manifest = { version: number; courseId: string; levels: ManifestLevel[] };

type LevelFile = {
    courseId: string;
    level: string;
    topics: ManifestTopic[];
    cards: Record<string, unknown>[];
};

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

if (manifest.version !== 2) {
    problems.push(`manifest.json: version ${manifest.version} ≠ 2`);
}

for (const level of manifest.levels) {
    const path = join(contentRoot, manifest.courseId, level.file);
    const file = JSON.parse(readFileSync(path, "utf8")) as LevelFile;

    if (file.courseId !== manifest.courseId) {
        problems.push(`${level.file}: courseId "${file.courseId}" tidak cocok`);
    }
    if (file.level !== level.level) {
        problems.push(`${level.file}: level "${file.level}" ≠ manifest "${level.level}"`);
    }

    const topicKeys = new Set(level.topics.map((topic) => topic.key));
    const orders = level.topics.map((topic) => topic.order);
    if (new Set(orders).size !== orders.length) {
        problems.push(`${level.level}: ada nomor urut topik yang duplikat`);
    }

    const counts = new Map<string, number>();
    let missingExamples = 0;
    let missingGender = 0;
    const seenHere = new Set<string>();

    file.cards.forEach((card, index) => {
        const topic = String(card.topic ?? "");
        if (!topicKeys.has(topic)) {
            problems.push(
                `${level.file} #${index + 1} (${String(card.front ?? "?")}): topic "${topic}" tidak ada di manifest`,
            );
            return;
        }

        const result = cardInputSchema.safeParse({
            ...card,
            deckId: `de-${level.level.toLowerCase()}-${topic}`,
            courseId: file.courseId,
            source: "seed",
        });

        if (!result.success) {
            for (const issue of result.error.issues) {
                problems.push(
                    `${level.file} #${index + 1} (${String(card.front ?? "?")}): ${issue.path.join(".")} — ${issue.message}`,
                );
            }
            return;
        }

        const data = result.data;
        const contentKey = `${data.wordType}:${normalize(data.front)}`;
        if (seenHere.has(contentKey)) {
            problems.push(`${level.file}: duplikat "${data.front}" (#${index + 1})`);
        }
        seenHere.add(contentKey);

        const previous = allFronts.get(contentKey);
        if (previous && previous !== level.level) {
            problems.push(
                `${data.front}: muncul di ${previous} dan ${level.level} (hanya boleh di level terendah)`,
            );
        } else if (!previous) {
            allFronts.set(contentKey, level.level);
        }

        if (data.level !== level.level) {
            problems.push(
                `${level.file} #${index + 1} (${data.front}): level kartu ${data.level} ≠ ${level.level}`,
            );
        }

        if (
            data.wordType === "noun" &&
            !data.gender &&
            !/^(der|die|das)\s/i.test(data.front) &&
            !ARTICLELESS_NOUNS.has(data.front.toLowerCase())
        ) {
            missingGender += 1;
        }
        if (!data.exampleDe) missingExamples += 1;

        counts.set(topic, (counts.get(topic) ?? 0) + 1);
    });

    for (const topic of level.topics) {
        const actual = counts.get(topic.key) ?? 0;
        if (actual !== topic.cardCount) {
            problems.push(
                `${level.level}/${topic.id}: manifest ${topic.cardCount} kartu, file berisi ${actual}`,
            );
        }
        if (actual === 0) {
            problems.push(`${level.level}/${topic.id}: topik kosong`);
        }
    }

    totalCards += file.cards.length;
    const coverage = ((file.cards.length - missingExamples) / Math.max(1, file.cards.length)) * 100;
    console.log(
        `${level.level.padEnd(3)} ${String(level.topics.length).padStart(3)} topik · ${String(file.cards.length).padStart(5)} kartu · contoh ${coverage.toFixed(0)}%`,
    );
    for (const topic of level.topics) {
        console.log(`      ${topic.icon} ${topic.title.padEnd(34)} ${String(topic.cardCount).padStart(4)}`);
    }
    if (missingGender > 0) {
        warnings.push(`${level.level}: ${missingGender} noun tanpa gender (sumber belum menyediakan artikel)`);
    }
    if (missingExamples > 0) {
        warnings.push(`${level.level}: ${missingExamples} kartu tanpa contoh kalimat`);
    }
}

const migration = JSON.parse(
    readFileSync(join(contentRoot, "migration-map.json"), "utf8"),
) as Record<string, string>;
console.log(`\nTotal ${totalCards} kartu di ${manifest.levels.length} band.`);
console.log(`Peta migrasi: ${Object.keys(migration).length} id lama → id topik.`);

if (warnings.length > 0) {
    console.log(`\nPeringatan kualitas (${warnings.length}):`);
    for (const warning of warnings) console.log(`- ${warning}`);
}

if (problems.length > 0) {
    console.error(`\n${problems.length} masalah:`);
    for (const problem of problems.slice(0, 80)) console.error(`- ${problem}`);
    process.exitCode = 1;
} else {
    console.log("\nTidak ada masalah. Konten siap dipakai.");
}
