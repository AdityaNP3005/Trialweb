import { describe, expect, it } from "vitest";
import { contentUnits, loadContentCards } from "@/lib/content/registry";

describe("Mandarin enrichment", () => {
    it("splits every pinyin per Hanzi and adds measure words, characters and examples", async () => {
        const units = contentUnits.filter((unit) => unit.courseId === "zh");
        const cards = (await Promise.all(units.map((unit) => loadContentCards(unit.id)))).flat();
        expect(cards.length).toBe(2891);

        for (const card of cards) {
            const hanzi = [...card.front].filter((char) => /\p{Script=Han}/u.test(char));
            expect(card.pinyinParts?.length, card.front).toBe(hanzi.length);
        }

        const book = cards.find((card) => card.front === "書")!;
        expect(book.measureWords).toContain("本 běn");
        const computer = cards.find((card) => card.front === "電腦")!;
        expect(computer.characters?.map((info) => info.char)).toEqual(["電", "腦"]);
        expect(cards.filter((card) => card.exampleDe).length).toBeGreaterThan(2000);
        // Examples must be Traditional: no Simplified-only characters such as 们/会/对.
        expect(cards.filter((card) => /[们会对这说时]/.test(card.exampleDe ?? ""))).toEqual([]);
    });
});
