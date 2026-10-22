import data from "@/content/de/schreiben.json";
import type { SchreibenSet } from "./schreiben";

/** Bundled Goethe-style writing tasks (two sets per band). */
export const schreibenSets = data.sets as unknown as SchreibenSet[];

export function getSchreibenSet(id: string): SchreibenSet | null {
    return schreibenSets.find((set) => set.id === id) ?? null;
}
