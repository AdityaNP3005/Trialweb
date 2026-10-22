import { describe, expect, it } from "vitest";
import { foldText, searchCards } from "@/lib/content/search";
import { gradeSpeech } from "@/lib/study/speech-match";

const card = (front: string, meaningId: string, meaningEn = "", pinyin: string | null = null) => ({
    front,
    meaningId,
    meaningEn,
    pinyin,
});

describe("searchCards", () => {
    const cards = [
        card("die Straße", "jalan"),
        card("das Haus", "rumah", "house"),
        card("das Krankenhaus", "rumah sakit", "hospital"),
        card("Hausaufgabe", "pekerjaan rumah"),
        card("老師", "guru", "teacher", "lǎo shī"),
        card("das Känguru", "kanguru"),
    ];

    it("folds umlauts, ß and tone marks", () => {
        expect(foldText("Straße Ärger")).toBe("strasse arger");
        expect(foldText("lǎo shī")).toBe("lao shi");
    });

    it("ranks the word itself above longer words and meanings", () => {
        expect(searchCards(cards, "haus").map((entry) => entry.front)).toEqual([
            "das Haus",
            "Hausaufgabe",
            "das Krankenhaus",
        ]);
    });

    it("matches meanings, whole words first", () => {
        expect(searchCards(cards, "rumah").map((entry) => entry.front)).toEqual([
            "das Haus",
            "das Krankenhaus",
            "Hausaufgabe",
        ]);
    });

    it("finds pinyin without tones or spaces, and ß typed as ss", () => {
        expect(searchCards(cards, "laoshi")[0].front).toBe("老師");
        expect(searchCards(cards, "guru").map((entry) => entry.front)).toEqual(["老師", "das Känguru"]);
        expect(searchCards(cards, "strasse")[0].front).toBe("die Straße");
        expect(searchCards(cards, "   ")).toEqual([]);
    });
});

describe("gradeSpeech", () => {
    const haus = { front: "Haus", gender: "das" as const, script: "latin" as const };

    it("accepts the word with or without its article", () => {
        expect(gradeSpeech(["Haus"], haus).verdict).toBe("match");
        expect(gradeSpeech(["das Haus"], haus).verdict).toBe("match");
        expect(gradeSpeech(["ja das Haus bitte"], haus).verdict).toBe("match");
        expect(gradeSpeech(["Hausaufgabe"], haus).verdict).not.toBe("match");
    });

    it("picks the best alternative and grades near misses", () => {
        const result = gradeSpeech(["aus", "Hans"], haus);
        expect(result.verdict).toBe("close");
        expect(gradeSpeech(["Katze"], haus).verdict).toBe("miss");
        expect(gradeSpeech([], haus).verdict).toBe("miss");
    });

    it("compares Hanzi character by character", () => {
        const teacher = { front: "老師", gender: null, script: "hanzi" as const };
        expect(gradeSpeech(["老師。"], teacher).verdict).toBe("match");
        expect(gradeSpeech(["老是"], teacher).verdict).toBe("close");
    });
});
