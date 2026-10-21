import { getDoc, setDoc } from "firebase/firestore";
import type { PlaylistProgress } from "@/types";
import { videoPlaylistDocRef } from "@/lib/firebase/paths";

/**
 * One document per playlist: `users/{uid}/videoPlaylists/{playlistId}`.
 * `videos` is a nested map, and writes use `merge: true`, so a tick only touches
 * the entry for the current video (dotted paths do not survive `merge`, maps do).
 */
export async function fetchVideoProgress(
    uid: string,
    playlistId: string,
): Promise<PlaylistProgress | null> {
    const snapshot = await getDoc(videoPlaylistDocRef(uid, playlistId));
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Omit<PlaylistProgress, "playlistId">;
    return {
        ...data,
        playlistId,
        lastVideoId: data.lastVideoId ?? null,
        lastPositionSec: data.lastPositionSec ?? 0,
        videos: data.videos ?? {},
        updatedAt: data.updatedAt ?? 0,
    };
}

export async function saveVideoProgress(
    uid: string,
    progress: PlaylistProgress,
): Promise<void> {
    const { playlistId, ...data } = progress;
    await setDoc(videoPlaylistDocRef(uid, playlistId), data, { merge: true });
}
