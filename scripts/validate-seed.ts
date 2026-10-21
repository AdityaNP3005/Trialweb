import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cardInputSchema } from "../src/lib/validation/schemas.ts";

const seedPath = fileURLToPath(
    new URL("../src/content/de/seed-a1.json", import.meta.url),
);

type SeedFile = {
    courseId: string;
    deck: { name: string; level: string; tags: string[] };
    cards: Record<string, unknown>[];
};

const seed = JSON.parse(readFileSync(seedPath, "utf8")) as SeedFile;

const problems: string[] = [];
const seen = new Map<string, number>();
const tagCount = new Map<string, number>();

// Weekdays are nouns but are normally used without an article ("am Montag").
const ARTICLELESS_NOUNS = new Set([
    "montag",
    "dienstag",
    "mittwoch",
    "donnerstag",
    "freitag",
    "samstag",
    "sonntag",
]);

seed.cards.forEach((card, index) => {
    const parsed = cardInputSchema.safeParse({
        ...card,
        deckId: "seed",
        courseId: seed.courseId,
        source: "seed",
    });

    if (!parsed.success) {
        for (const issue of parsed.error.issues) {
            problems.push(
                `#${index + 1} (${String(card.front ?? "?")}): ${issue.path.join(".")} — ${issue.message}`,
            );
        }
        return;
    }

    const front = parsed.data.front.toLowerCase();
    if (seen.has(front)) {
        problems.push(
            `duplicate front "${parsed.data.front}" at #${index + 1} (first seen #${seen.get(front)})`,
        );
    } else {
        seen.set(front, index + 1);
    }

    if (
        parsed.data.wordType === "noun" &&
        !parsed.data.gender &&
        !parsed.data.front.match(/^(der|die|das)\s/i) &&
        !ARTICLELESS_NOUNS.has(parsed.data.front.toLowerCase())
    ) {
        problems.push(
            `#${index + 1} (${parsed.data.front}): noun without article/gender`,
        );
    }

    for (const tag of parsed.data.tags) {
        tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }
});

const tagSummary = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => `${tag}:${count}`)
    .join("  ");

console.log(`Seed deck: ${seed.deck.name} (${seed.courseId}, ${seed.deck.level})`);
console.log(`Cards: ${seed.cards.length} · unique: ${seen.size}`);
console.log(`Tags: ${tagSummary}`);

if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
}

console.log("\nSeed deck is valid.");
