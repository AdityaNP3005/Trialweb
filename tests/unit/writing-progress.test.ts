import { afterEach, describe, expect, it, vi } from "vitest";
import { GuestStore, GUEST_STORAGE_KEY } from "@/lib/store/local-store";

afterEach(() => vi.unstubAllGlobals());

describe("guest writing progress", () => {
    it("stores each written Hanzi once per course and keeps it across store instances", async () => {
        const storage = new Map<string, string>();
        vi.stubGlobal("window", {
            localStorage: {
                getItem: (key: string) => storage.get(key) ?? null,
                setItem: (key: string, value: string) => storage.set(key, value),
                removeItem: (key: string) => storage.delete(key),
            },
        });

        const store = new GuestStore("id");
        await store.markCharacterWritten("zh", "你");
        await store.markCharacterWritten("zh", "你");
        await store.markCharacterWritten("zh", "好");

        expect(await new GuestStore("id").getWrittenCharacters("zh")).toEqual(["你", "好"]);
        expect(await new GuestStore("id").getWrittenCharacters("de")).toEqual([]);
        expect(JSON.parse(storage.get(GUEST_STORAGE_KEY)!).writing).toEqual({ zh: ["你", "好"] });
    });
});
