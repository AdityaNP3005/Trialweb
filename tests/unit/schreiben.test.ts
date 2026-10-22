import { describe, expect, it } from "vitest";
import {
    analyzeText,
    checkFormField,
    checkReformulation,
    countWords,
    maxPoints,
    rubricFor,
    scoreRubric,
    suggestRatings,
    type TextPart,
} from "@/lib/writing/schreiben";

const part = (overrides: Partial<TextPart> = {}): TextPart => ({
    type: "text", id: "t", title: "Teil 2", minutes: 20, situation: "", hint: { id: "", en: "" },
    points: [
        { de: "Warum?", hint: { id: "", en: "" }, keywords: ["wochenende"] },
        { de: "Öffnungszeiten", hint: { id: "", en: "" }, keywords: ["geöffnet", "öffnungszeit"] },
        { de: "Preis", hint: { id: "", en: "" }, keywords: ["kostet", "preis"] },
    ],
    words: 30, register: "formal", letter: true, rubric: "a1", model: "", ...overrides,
});

describe("Goethe Schreiben rubrics (official weights)", () => {
    it("matches the maximum points of the official score sheets", () => {
        expect(maxPoints(rubricFor("a1", 3))).toBe(10);
        expect(maxPoints(rubricFor("a2", 3))).toBe(10);
        expect(maxPoints(rubricFor("b1-long", 3)) * 2 + maxPoints(rubricFor("b1-short", 3))).toBe(100);
        expect(maxPoints(rubricFor("b2c1-long", 4)) + maxPoints(rubricFor("b2c1-short", 4))).toBe(100);
        expect(maxPoints(rubricFor("c2", 3))).toBe(80);
    });

    it("zeroes a task when a gate criterion is 0, otherwise sums the levels", () => {
        const b1 = rubricFor("b1-long", 3);
        expect(scoreRubric(b1, { erfuellung: "A", kohaerenz: "B", wortschatz: "C", strukturen: "D" })).toBe(25);
        expect(scoreRubric(b1, { erfuellung: "E", kohaerenz: "A", wortschatz: "A", strukturen: "A" })).toBe(0);
        const c2 = rubricFor("c2", 3);
        expect(scoreRubric(c2, { erfuellung: "A", textaufbau: "A", kohaerenz: "B", wortschatz: "B", strukturen: "C" })).toBe(64);
        expect(scoreRubric(c2, { erfuellung: "A", textaufbau: "A", kohaerenz: "A", wortschatz: "A", strukturen: "E" })).toBe(0);
    });
});

describe("automatic text checks", () => {
    it("counts words, content points, salutation, closing and connectors", () => {
        const text = "Sehr geehrte Damen und Herren, ich komme am Wochenende. Wann haben Sie geöffnet, weil ich arbeite? Mit freundlichen Grüßen Ana";
        const analysis = analyzeText(part(), text);
        expect(analysis.words).toBe(countWords(text));
        expect(analysis.covered).toEqual([true, true, false]);
        expect([analysis.greeting, analysis.closing, analysis.tooShort]).toEqual([true, true, false]);
        expect(analysis.connectors).toContain("weil");
        const ratings = suggestRatings(part(), rubricFor("a1", 3), analysis);
        expect(ratings).toMatchObject({ "punkt-1": "A", "punkt-2": "A", "punkt-3": "E", gestaltung: "A" });
    });

    it("applies the official under-50%-of-words rule and flags du in formal letters", () => {
        const short = analyzeText(part(), "Hallo, was kostet es?");
        expect(short.tooShort).toBe(true);
        expect(suggestRatings(part({ rubric: "a2" }), rubricFor("a2", 3), short).erfuellung).toBe("E");
        const informal = analyzeText(part(), "Hallo, kannst du mir sagen, wann ihr geöffnet habt? Viele Grüße");
        expect(informal.registerIssue).toBe("du-in-formal");
    });
});

describe("form and reformulation checks", () => {
    it("accepts form answers regardless of case, spaces and ß", () => {
        expect(checkFormField(" 50674 köln ", ["50674 Köln"])).toBe(true);
        expect(checkFormField("Lindenstrasse 12", ["Lindenstraße 12"])).toBe(true);
        expect(checkFormField("München", ["50674 Köln"])).toBe(false);
    });

    it("gives 2 for an accepted reformulation, 1 when only the keyword is used, 0 otherwise", () => {
        const item = { original: "", keyword: "Schlafmangel", answers: ["Schlafmangel führt zu Konzentrationsproblemen."] };
        expect(checkReformulation("Schlafmangel führt zu Konzentrationsproblemen", item)).toBe(2);
        expect(checkReformulation("Bei Schlafmangel konzentriert man sich schlecht.", item)).toBe(1);
        expect(checkReformulation("Man schläft zu wenig.", item)).toBe(0);
    });
});

describe("bundled Schreiben tasks", async () => {
    const { default: data } = await import("@/content/de/schreiben.json");
    const sets = data.sets as unknown as import("@/lib/writing/schreiben").SchreibenSet[];

    it("has two sets for every band A1–C2 with the official part structure", () => {
        const byLevel = Object.groupBy(sets, (set) => set.level);
        for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"] as const) {
            expect(byLevel[level]?.length, level).toBe(2);
        }
        const shape = (level: string) => sets.find((set) => set.level === level)!.parts.map((part) => part.type);
        expect(shape("A1")).toEqual(["form", "text"]);
        expect(shape("B1")).toEqual(["text", "text", "text"]);
        expect(shape("C2")).toEqual(["reform", "text"]);
    });

    it("model answers pass the app's own automatic checks", () => {
        for (const set of sets) {
            for (const part of set.parts) {
                if (part.type !== "text") continue;
                const label = `${set.id}/${part.id}`;
                const analysis = analyzeText(part, part.model);
                expect(analysis.covered, label).toEqual(part.points.map(() => true));
                expect(analysis.words, label).toBeGreaterThanOrEqual(part.words * 0.8);
                expect(analysis.words, label).toBeLessThanOrEqual(part.words * 1.35);
                expect(analysis.registerIssue, label).toBeNull();
                if (part.letter) expect([analysis.greeting, analysis.closing], label).toEqual([true, true]);
            }
        }
    });

    it("reformulation answers use the given word and score 2 against themselves", () => {
        for (const set of sets) {
            for (const part of set.parts) {
                if (part.type !== "reform") continue;
                expect(part.items).toHaveLength(10);
                for (const item of part.items) {
                    for (const answer of item.answers) {
                        expect(answer, item.keyword).toContain(item.keyword);
                        expect(checkReformulation(answer, item)).toBe(2);
                    }
                }
            }
        }
    });
});
