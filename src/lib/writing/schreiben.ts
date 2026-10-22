/**
 * Goethe-Zertifikat Schreiben: task types, official rubrics and the automatic
 * checks the app can do. Weights come from the official Modellsatz/Übungssatz
 * score sheets (see docs/GERMAN-SCHREIBEN.md). Language quality (Wortschatz,
 * Strukturen) cannot be judged automatically, so learners rate it themselves
 * against the official descriptors after comparing with the model answer.
 */

export type Localized = { id: string; en: string };

export type ContentPoint = {
    de: string;
    hint: Localized;
    /** Lower-case stems; any match counts the point as probably covered. */
    keywords: string[];
};

export type RubricId =
    | "a1"
    | "a2"
    | "b1-long"
    | "b1-short"
    | "b2c1-long"
    | "b2c1-short"
    | "c2";

export type FormPart = {
    type: "form";
    id: string;
    title: string;
    minutes: number;
    situation: string;
    hint: Localized;
    given: { label: string; value: string }[];
    fields: { label: string; answers: string[] }[];
};

export type TextPart = {
    type: "text";
    id: string;
    title: string;
    minutes: number;
    situation: string;
    hint: Localized;
    /** Forum post, guestbook entry or statements the text responds to. */
    stimulus?: string[];
    points: ContentPoint[];
    words: number;
    register: "formal" | "informal" | "neutral";
    /** Letters, e-mails and messages need a salutation and a closing. */
    letter: boolean;
    rubric: RubricId;
    model: string;
};

export type ReformPart = {
    type: "reform";
    id: string;
    title: string;
    minutes: number;
    situation: string;
    hint: Localized;
    example: { original: string; keyword: string; answer: string };
    items: { original: string; keyword: string; answers: string[] }[];
};

export type SchreibenPart = FormPart | TextPart | ReformPart;

export type SchreibenSet = {
    id: string;
    level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
    title: string;
    parts: SchreibenPart[];
};

export type Level = "A" | "B" | "C" | "D" | "E";

export type Criterion = {
    id: string;
    /** German name as on the Goethe score sheet. */
    name: string;
    label: Localized;
    options: { level: Level; points: number; description: Localized }[];
    /** 0 points here makes the whole task 0 (official rule). */
    gate: boolean;
};

export type Rubric = { criteria: Criterion[]; multiplier: number };

const FIVE: Level[] = ["A", "B", "C", "D", "E"];

function scale(points: number[], descriptions: Localized[]) {
    return points.map((value, index) => ({
        level: FIVE[index],
        points: value,
        description: descriptions[index],
    }));
}

const fulfilment = (count: number): Localized[] => [
    { id: `Semua ${count} poin isi dibahas lengkap dan sesuai; register tepat.`, en: `All ${count} content points fully and appropriately covered; right register.` },
    { id: "Hampir semua poin isi sesuai (satu kurang lengkap); register masih tepat.", en: "Nearly all points appropriate (one only partly); register largely right." },
    { id: "Sebagian poin isi sesuai, sebagian hanya sebagian; register kadang tidak tepat.", en: "Some points appropriate, others only partly; register partly off." },
    { id: "Hanya satu poin isi yang sesuai atau sebagian; register tidak tepat.", en: "Only one point appropriate or partly covered; register not appropriate." },
    { id: "Kurang dari 50% jumlah kata yang diminta atau melenceng dari topik.", en: "Under 50% of the required words or off topic." },
];

const coherence: Localized[] = [
    { id: "Struktur teks (pembuka, urutan, penutup) jelas dan efektif; kalimat terhubung dengan tepat.", en: "Clear, effective structure; sentences linked appropriately." },
    { id: "Struktur sebagian besar terlihat; penghubung kalimat sebagian besar tepat.", en: "Structure mostly clear; linking mostly appropriate." },
    { id: "Struktur hanya kadang terlihat; penghubung kalimat sebagian tepat.", en: "Structure only in places; linking partly appropriate." },
    { id: "Struktur hampir tidak terlihat; kalimat hampir tidak terhubung.", en: "Structure barely visible; sentences barely linked." },
    { id: "Teks secara keseluruhan tidak memadai.", en: "Text inadequate throughout." },
];

const language = (what: Localized): Localized[] => [
    { id: `${what.id} bervariasi; kesalahan sesekali tidak mengganggu pemahaman.`, en: `Varied ${what.en}; occasional slips do not hinder understanding.` },
    { id: `${what.id} sebagian besar sesuai; beberapa kesalahan tidak mengganggu pemahaman.`, en: `${what.en} mostly appropriate; several errors do not hinder understanding.` },
    { id: `${what.id} terbatas; beberapa kesalahan sebagian mengganggu pemahaman.`, en: `Limited ${what.en}; errors partly hinder understanding.` },
    { id: `${what.id} hampir tidak ada; kesalahan sangat mengganggu pemahaman.`, en: `Hardly any ${what.en}; errors seriously hinder understanding.` },
    { id: "Teks secara keseluruhan tidak memadai.", en: "Text inadequate throughout." },
];

const VOCAB = { id: "Kosakata", en: "vocabulary" };
const GRAMMAR = { id: "Tata bahasa & ejaan", en: "grammar and spelling" };

function fourCriteria(points: [number[], number[], number[], number[]], count: number): Criterion[] {
    return [
        { id: "erfuellung", name: "Erfüllung", label: { id: "Pemenuhan tugas", en: "Task fulfilment" }, options: scale(points[0], fulfilment(count)), gate: true },
        { id: "kohaerenz", name: "Kohärenz", label: { id: "Koherensi", en: "Coherence" }, options: scale(points[1], coherence), gate: false },
        { id: "wortschatz", name: "Wortschatz", label: { id: "Kosakata", en: "Vocabulary" }, options: scale(points[2], language(VOCAB)), gate: false },
        { id: "strukturen", name: "Strukturen", label: { id: "Struktur", en: "Structures" }, options: scale(points[3], language(GRAMMAR)), gate: false },
    ];
}

const TEN = [10, 7.5, 5, 2.5, 0];

/** Rubric for a text task; `count` is its number of content points. */
export function rubricFor(id: RubricId, count: number): Rubric {
    switch (id) {
        case "a1":
            // Start Deutsch 1: each content point 3 / 1.5 / 0, text form 1 / 0.5 / 0.
            return {
                multiplier: 1,
                criteria: [
                    ...Array.from({ length: count }, (_, index): Criterion => ({
                        id: `punkt-${index + 1}`,
                        name: `Inhaltspunkt ${index + 1}`,
                        label: { id: `Poin isi ${index + 1}`, en: `Content point ${index + 1}` },
                        gate: false,
                        options: [
                            { level: "A", points: 3, description: { id: "Terpenuhi dan dapat dipahami.", en: "Fulfilled and understandable." } },
                            { level: "C", points: 1.5, description: { id: "Hanya sebagian (masalah bahasa atau isi).", en: "Only partly (language or content problems)." } },
                            { level: "E", points: 0, description: { id: "Tidak terpenuhi atau tidak dapat dipahami.", en: "Not fulfilled or not understandable." } },
                        ],
                    })),
                    {
                        id: "gestaltung",
                        name: "Kommunikative Gestaltung",
                        label: { id: "Bentuk teks (sapaan, salam)", en: "Text form (salutation, closing)" },
                        gate: false,
                        options: [
                            { level: "A", points: 1, description: { id: "Sesuai jenis teks.", en: "Appropriate for the text type." } },
                            { level: "C", points: 0.5, description: { id: "Ungkapan tidak lazim atau kurang, mis. tanpa sapaan.", en: "Untypical or missing phrases, e.g. no salutation." } },
                            { level: "E", points: 0, description: { id: "Tidak ada ungkapan khas jenis teks.", en: "No text-type phrases." } },
                        ],
                    },
                ],
            };
        case "a2":
            return {
                multiplier: 1,
                criteria: [
                    { id: "erfuellung", name: "Aufgabenerfüllung", label: { id: "Pemenuhan tugas & register", en: "Task fulfilment & register" }, options: scale([5, 3.5, 2, 0.5, 0], fulfilment(count)), gate: true },
                    { id: "sprache", name: "Sprache", label: { id: "Bahasa (koherensi, kosakata, struktur)", en: "Language (coherence, vocabulary, structures)" }, options: scale([5, 3.5, 2, 0.5, 0], language({ id: "Bahasa", en: "language" })), gate: false },
                ],
            };
        case "b1-long":
            return { multiplier: 1, criteria: fourCriteria([TEN, TEN, TEN, TEN], count) };
        case "b1-short":
            return { multiplier: 1, criteria: fourCriteria([[4, 3, 2, 1, 0], [4, 3, 2, 1, 0], [6, 4.5, 3, 1.5, 0], [6, 4.5, 3, 1.5, 0]], count) };
        case "b2c1-long":
            return { multiplier: 1, criteria: fourCriteria([[14, 10.5, 7, 3.5, 0], [14, 10.5, 7, 3.5, 0], [16, 12, 8, 4, 0], [16, 12, 8, 4, 0]], count) };
        case "b2c1-short":
            return { multiplier: 1, criteria: fourCriteria([TEN, TEN, TEN, TEN], count) };
        case "c2": {
            // GDS: five criteria of 4 points, every 0 zeroes the task, then × 4.
            const four = [4, 3, 2, 1, 0];
            const [erfuellung, kohaerenz, wortschatz, strukturen] = fourCriteria([four, four, four, four], count);
            const aufbau: Criterion = {
                id: "textaufbau",
                name: "Textaufbau",
                label: { id: "Susunan & argumentasi", en: "Structure & argument" },
                gate: true,
                options: scale(four, [
                    { id: "Penyajian/argumentasi jelas dan efektif sepanjang teks.", en: "Clear, effective presentation/argument throughout." },
                    { id: "Susunan dan argumentasi terlihat.", en: "Structure and argument recognisable." },
                    { id: "Penyajian/argumentasi kadang tidak jelas.", en: "Presentation/argument unclear in places." },
                    { id: "Paragraf berderet tanpa hubungan; sebagian besar tidak jelas.", en: "Unconnected paragraphs; largely unclear." },
                    { id: "Penyajian/argumentasi tidak jelas.", en: "Presentation/argument unclear." },
                ]),
            };
            return {
                multiplier: 4,
                criteria: [erfuellung, aufbau, kohaerenz, wortschatz, strukturen].map((criterion) => ({ ...criterion, gate: true })),
            };
        }
    }
}

export function maxPoints(rubric: Rubric): number {
    return rubric.criteria.reduce((sum, criterion) => sum + criterion.options[0].points, 0) * rubric.multiplier;
}

/** Sum of the chosen levels; a gate criterion at 0 points makes the task 0. */
export function scoreRubric(rubric: Rubric, ratings: Record<string, Level | undefined>): number {
    let total = 0;
    for (const criterion of rubric.criteria) {
        const option = criterion.options.find((entry) => entry.level === ratings[criterion.id]);
        if (!option) continue;
        if (criterion.gate && option.points === 0) return 0;
        total += option.points;
    }
    return total * rubric.multiplier;
}

/* ------------------------------------------------------------------ */
/* Automatic checks                                                    */
/* ------------------------------------------------------------------ */

export function countWords(text: string): number {
    return text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
}

const GREETING = /\b(liebe[rs]?|hallo|hi|sehr geehrte[rs]?|guten (tag|morgen|abend)|grüß gott|servus)\b/i;
const CLOSING = /\b(viele grüße|liebe grüße|herzliche grüße|beste grüße|freundliche grüße|mit freundlichen grüßen|bis bald|bis dann|tschüss?|lg|vg)\b/i;
const INFORMAL_PRONOUN = /\b(du|dich|dir|dein|deine|deinen|deinem|deiner|euch|euer)\b/i;
const FORMAL_PRONOUN = /\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer)\b/;

/** Linking words the coherence hint counts (distinct ones). */
const CONNECTORS = [
    "weil", "denn", "deshalb", "deswegen", "darum", "daher", "außerdem", "trotzdem", "obwohl", "aber",
    "jedoch", "zuerst", "dann", "danach", "schließlich", "zum schluss", "einerseits", "andererseits",
    "zum beispiel", "beispielsweise", "dass", "wenn", "damit", "sodass", "allerdings", "zwar",
    "erstens", "zweitens", "im gegensatz", "dennoch", "folglich", "zudem", "darüber hinaus",
    "abschließend", "zusammenfassend", "insofern", "während", "hingegen",
];

export type TextAnalysis = {
    words: number;
    tooShort: boolean;
    covered: boolean[];
    greeting: boolean;
    closing: boolean;
    /** "du" in a formal text or no "Sie" where it is expected. */
    registerIssue: "du-in-formal" | null;
    connectors: string[];
};

export function analyzeText(part: TextPart, text: string): TextAnalysis {
    const lower = text.toLowerCase();
    const words = countWords(text);
    const body = text.replace(GREETING, "").replace(CLOSING, "");
    return {
        words,
        tooShort: words < part.words * 0.5,
        covered: part.points.map((point) => point.keywords.some((keyword) => lower.includes(keyword))),
        greeting: GREETING.test(text),
        closing: CLOSING.test(text),
        registerIssue:
            part.register === "formal" && INFORMAL_PRONOUN.test(body) && !FORMAL_PRONOUN.test(body)
                ? "du-in-formal"
                : null,
        connectors: CONNECTORS.filter((connector) => new RegExp(`\\b${connector}\\b`, "i").test(lower)),
    };
}

/**
 * Starting ratings from the automatic checks. Only what text analysis can
 * support is suggested; Wortschatz and Strukturen are left to the learner.
 */
export function suggestRatings(part: TextPart, rubric: Rubric, analysis: TextAnalysis): Record<string, Level> {
    const ratings: Record<string, Level> = {};
    const coveredCount = analysis.covered.filter(Boolean).length;
    const missing = part.points.length - coveredCount;

    for (const criterion of rubric.criteria) {
        if (criterion.id.startsWith("punkt-")) {
            const index = Number(criterion.id.slice(6)) - 1;
            ratings[criterion.id] = analysis.tooShort ? "E" : analysis.covered[index] ? "A" : "E";
        } else if (criterion.id === "gestaltung") {
            const both = analysis.greeting && analysis.closing;
            ratings[criterion.id] = both ? "A" : analysis.greeting || analysis.closing ? "C" : "E";
        } else if (criterion.id === "erfuellung") {
            if (analysis.tooShort || coveredCount === 0) ratings[criterion.id] = "E";
            else ratings[criterion.id] = (["A", "B", "C", "D"] as Level[])[Math.min(3, missing + (analysis.registerIssue ? 1 : 0))];
        } else if (criterion.id === "kohaerenz") {
            const distinct = analysis.connectors.length;
            ratings[criterion.id] = distinct >= 5 ? "A" : distinct >= 3 ? "B" : distinct >= 1 ? "C" : "D";
        }
    }
    return ratings;
}

/* ------------------------------------------------------------------ */
/* Form (A1 Teil 1) and reformulation (C2 Teil 1)                     */
/* ------------------------------------------------------------------ */

function normalizeAnswer(text: string): string {
    return text
        .normalize("NFC")
        .toLowerCase()
        .replace(/ß/g, "ss")
        .replace(/[.,;:!?„“"'()]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function checkFormField(answer: string, accepted: string[]): boolean {
    const given = normalizeAnswer(answer).replace(/\s/g, "");
    return accepted.some((entry) => normalizeAnswer(entry).replace(/\s/g, "") === given);
}

/**
 * 2 points: matches an accepted reformulation; 1: uses the given word but
 * differs (to be checked by the learner); 0: keyword missing.
 */
export function checkReformulation(answer: string, item: ReformPart["items"][number]): 0 | 1 | 2 {
    const given = normalizeAnswer(answer);
    if (!given) return 0;
    if (item.answers.some((entry) => normalizeAnswer(entry) === given)) return 2;
    const stem = normalizeAnswer(item.keyword).slice(0, Math.max(4, item.keyword.length - 2));
    return given.includes(stem) ? 1 : 0;
}

/** Goethe modules are passed with 60 % of the points. */
export const PASS_RATIO = 0.6;
