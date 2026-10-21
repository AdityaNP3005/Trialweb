import type { CefrLevel, Gender, WordType } from "@/types";

export type SeedCard = {
    front: string;
    meaningId: string;
    meaningEn: string;
    gender?: Gender | null;
    wordType?: WordType;
    plural?: string | null;
    ipa?: string | null;
    exampleDe?: string | null;
    exampleId?: string | null;
    exampleEn?: string | null;
    tags?: string[];
    level?: CefrLevel;
};

export type SeedFile = {
    courseId: string;
    deck: {
        slug: string;
        name: string;
        description: string;
        level: CefrLevel;
        tags: string[];
    };
    cards: SeedCard[];
};

/** Loaded lazily so the landing page does not ship the deck bundle. */
export async function loadSeed(): Promise<SeedFile> {
    const loaded = await import("@/content/de/seed-a1.json");
    return loaded.default as SeedFile;
}
