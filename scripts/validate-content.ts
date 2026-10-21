import { existsSync, readFileSync } from "node:fs";
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

/* ------------------------------------------------------------------ */
/* Mandarin (當代中文): book → chapter, Hanzi + pinyin + EN + ID        */
/* ------------------------------------------------------------------ */

type ZhChapter = {
    id: string;
    key: string;
    title: string;
    order: number;
    cardCount: number;
};

type ZhManifest = {
    version: number;
    courseId: string;
    books: {
        id: string;
        label: string;
        title: string;
        order: number;
        file: string;
        chapters: ZhChapter[];
    }[];
};

type ZhCard = {
    front?: string;
    pinyin?: string | null;
    meaningEn?: string;
    meaningId?: string;
    chapter?: string;
    wordType?: string;
};

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const PINYIN_TONE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i;

const zhManifestPath = join(contentRoot, "zh", "manifest.json");
if (!existsSync(zhManifestPath)) {
    warnings.push("zh: manifest Mandarin belum ada");
} else {
    const zhManifest = JSON.parse(
        readFileSync(zhManifestPath, "utf8"),
    ) as ZhManifest;
    let zhCards = 0;
    let zhChapters = 0;

    for (const book of zhManifest.books) {
        const path = join(contentRoot, "zh", book.file);
        if (!existsSync(path)) {
            problems.push(`zh/${book.file}: file buku tidak ditemukan`);
            continue;
        }
        const file = JSON.parse(readFileSync(path, "utf8")) as {
            courseId?: string;
            chapters?: ZhChapter[];
            cards?: ZhCard[];
        };
        if (file.courseId !== "zh") {
            problems.push(`zh/${book.file}: courseId "${file.courseId}" tidak cocok`);
        }

        const cards = file.cards ?? [];
        const chapterKeys = new Set(book.chapters.map((chapter) => chapter.key));
        const counts = new Map<string, number>();
        const seen = new Map<string, string>();
        const idMissing: string[] = [];

        for (const [index, card] of cards.entries()) {
            const label = `zh/${book.file} #${index + 1}`;
            if (!card.front || !HAN.test(card.front)) {
                problems.push(`${label}: hanzi tidak valid ("${card.front ?? "?"}")`);
            }
            if (!card.pinyin) {
                warnings.push(`${label} (${card.front}): pinyin kosong`);
            } else if (/\d/.test(card.pinyin) && !PINYIN_TONE.test(card.pinyin)) {
                problems.push(
                    `${label} (${card.front}): pinyin "${card.pinyin}" memakai angka, harus tanda nada`,
                );
            }
            if (!card.meaningEn) problems.push(`${label} (${card.front}): arti Inggris kosong`);
            if (!card.meaningId) {
                problems.push(`${label} (${card.front}): arti Indonesia kosong`);
            } else if (
                card.meaningEn &&
                card.meaningId.trim().toLowerCase() === card.meaningEn.trim().toLowerCase() &&
                // Proper nouns ("Taiwan", "Japan") are legitimately identical.
                !/^[A-Z][A-Za-z'’-]+$/.test(card.meaningId.trim())
            ) {
                idMissing.push(card.front ?? "?");
            }
            if (!card.chapter || !chapterKeys.has(card.chapter)) {
                problems.push(
                    `${label} (${card.front}): bab "${card.chapter ?? "?"}" tidak ada di manifest`,
                );
            } else {
                counts.set(card.chapter, (counts.get(card.chapter) ?? 0) + 1);
            }

            const key = `${card.front}|${(card.pinyin ?? "").toLowerCase()}`;
            const previous = seen.get(key);
            if (previous) {
                problems.push(
                    `${label} (${card.front}): duplikat dengan bab ${previous}`,
                );
            } else {
                seen.set(key, card.chapter ?? "?");
            }
        }

        for (const chapter of book.chapters) {
            const actual = counts.get(chapter.key) ?? 0;
            if (actual !== chapter.cardCount) {
                problems.push(
                    `${book.label}/${chapter.id}: manifest ${chapter.cardCount} kartu, file berisi ${actual}`,
                );
            }
            if (actual === 0) {
                problems.push(`${book.label}/${chapter.id}: bab kosong`);
            }
        }

        zhCards += cards.length;
        zhChapters += book.chapters.length;
        console.log(
            `${book.label.padEnd(8)} ${String(book.chapters.length).padStart(3)} bab · ${String(cards.length).padStart(4)} kartu`,
        );
        if (idMissing.length > 0) {
            warnings.push(
                `${book.label}: ${idMissing.length} kartu masih memakai arti Inggris (belum diterjemahkan): ${idMissing
                    .slice(0, 5)
                    .join(", ")}`,
            );
        }
    }

    console.log(`Total ${zhCards} kartu Mandarin di ${zhChapters} bab.`);
}

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
