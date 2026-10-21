import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    writes: [] as { path: string; data: Record<string, unknown> }[],
    fetchProfile: vi.fn(), commit: vi.fn(async () => undefined),
}));
vi.mock("firebase/firestore", () => ({
    writeBatch: () => {
        const batch = {
            set: (path: string, data: Record<string, unknown>) => { mocks.writes.push({ path, data }); return batch; },
            commit: mocks.commit,
        };
        return batch;
    },
}));
vi.mock("@/lib/firebase/client", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/firebase/paths", () => Object.fromEntries([
    "cardDocRef", "dailyStatDocRef", "deckCycleDocRef", "deckDocRef", "progressDocRef", "userDocRef",
].map((name) => [name, (...args: string[]) => `${name}/${args.join("/")}`])));
vi.mock("@/lib/data/profile", () => ({ fetchProfile: mocks.fetchProfile, patchProfile: vi.fn() }));
vi.mock("@/lib/data/videos", () => ({ fetchVideoProgress: vi.fn(), saveVideoProgress: vi.fn() }));

import { migrateGuestData } from "@/lib/store/migrate";
import { GUEST_STORAGE_KEY } from "@/lib/store/local-store";
import { defaultProfileFor } from "@/lib/store/types";
import { loadReviewedGermanCards } from "@/lib/content/review-progress";

beforeEach(() => { mocks.writes.length = 0; vi.clearAllMocks(); });
afterEach(() => vi.unstubAllGlobals());

async function guestStorage() {
    const card = (await loadReviewedGermanCards()).find((entry) => entry.front === "Pfirsich")!;
    const oldDeck = card.id.replace(/-\d{4}$/, "");
    expect(oldDeck).not.toBe(card.deckId);
    const storage = new Map([[GUEST_STORAGE_KEY, JSON.stringify({
        version: 2, contentVersion: 5, decks: [], cards: [], cycles: {}, logs: [], dailyStats: {},
        profile: defaultProfileFor({ displayName: null, email: null, uiLocale: "id" }),
        progress: { [card.id]: { cardId: card.id, deckId: oldDeck, courseId: "de", cycle: 1,
            known: true, repeatsInCycle: 0, totalRepeats: 2, knownCount: 3, lastSeenAt: 10, lastActionAt: 10 } },
    })]]);
    vi.stubGlobal("window", { localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
    } });
    return { storage, card };
}

describe("guest to cloud topic layout", () => {
    it("normalizes old guest histories before merging, without copying bundled card content", async () => {
        const { storage, card } = await guestStorage();
        mocks.fetchProfile.mockResolvedValue({ topicsV6: true });
        expect(await migrateGuestData("test-user", 0)).toBe(true);
        const saved = mocks.writes.find((entry) => entry.path === `progressDocRef/test-user/${card.id}`);
        expect(saved?.data).toMatchObject({ cardId: card.id, deckId: card.deckId, known: true,
            knownCount: 3, totalRepeats: 2 });
        expect(mocks.writes.some((entry) => entry.path.startsWith("cardDocRef/"))).toBe(false);
        expect(storage.has(GUEST_STORAGE_KEY)).toBe(false);
    });

    it("retains the guest snapshot if the cloud account's layout migration has not finished", async () => {
        const { storage } = await guestStorage();
        mocks.fetchProfile.mockResolvedValue({ topicsV6: false });
        expect(await migrateGuestData("test-user", 0)).toBe(false);
        expect(mocks.writes).toHaveLength(0);
        expect(storage.has(GUEST_STORAGE_KEY)).toBe(true);
    });
});
