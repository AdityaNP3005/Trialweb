import { describe, expect, it } from "vitest";
import { guessMapping, mapRows, parseCsv } from "@/lib/import/csv";

describe("parseCsv", () => {
    it("parses comma separated files with a header row", () => {
        const table = parseCsv("front,meaning_id\nHallo,halo\nTschüss,dadah\n");
        expect(table.headers).toEqual(["front", "meaning_id"]);
        expect(table.rows).toHaveLength(2);
    });

    it("skips Anki comment lines and detects tabs", () => {
        const table = parseCsv(
            "#separator:tab\n#html:true\nfront\tmeaning_id\nHallo\thalo\n",
        );
        expect(table.headers).toEqual(["front", "meaning_id"]);
        expect(table.rows[0].meaning_id).toBe("halo");
    });

    it("drops empty rows", () => {
        const table = parseCsv("front,meaning_id\nHallo,halo\n,\n");
        expect(table.rows).toHaveLength(1);
    });
});

describe("guessMapping", () => {
    it("guesses common column names", () => {
        const mapping = guessMapping(["Wort", "Arti", "Tags", "Level"]);
        expect(mapping.front).toBe("Wort");
        expect(mapping.meaningId).toBe("Arti");
        expect(mapping.tags).toBe("Tags");
        expect(mapping.level).toBe("Level");
    });
});

describe("mapRows", () => {
    const defaults = { level: "A1" as const, existingFronts: new Set<string>() };

    it("maps valid rows, skips duplicates and reports invalid rows", () => {
        const table = parseCsv(
            [
                "front,meaning_id,meaning_en,tags",
                "Hallo,halo,hello,sapaan",
                "hallo,halo lagi,hello again,sapaan",
                ",tanpa kata,no word,sapaan",
                "Brot,roti,bread,makanan;dasar",
            ].join("\n"),
        );

        const mapping = guessMapping(table.headers);
        const result = mapRows(table, mapping, defaults);

        expect(result.cards).toHaveLength(2);
        expect(result.duplicates).toBe(1);
        expect(result.invalid).toBe(1);
        expect(result.cards[1].tags).toEqual(["makanan", "dasar"]);
        expect(result.cards[1].source).toBe("import");
    });

    it("falls back to the Indonesian meaning for the English column", () => {
        const table = parseCsv("front,meaning_id\nHaus,rumah\n");
        const result = mapRows(table, guessMapping(table.headers), defaults);
        expect(result.cards[0].meaningEn).toBe("rumah");
    });

    it("respects a per-row level when present", () => {
        const table = parseCsv("front,meaning_id,level\nHaus,rumah,B1\n");
        const result = mapRows(table, guessMapping(table.headers), defaults);
        expect(result.cards[0].level).toBe("B1");
    });
});
