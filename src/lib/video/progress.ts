import type {
    PlaylistProgress,
    VideoLesson,
    VideoPlaylist,
    VideoWatch,
} from "@/types";

/** A lesson counts as finished once 92% is watched (or the player reports ENDED). */
export const COMPLETE_RATIO = 0.92;

export type WatchState = "new" | "active" | "done";

export function emptyPlaylistProgress(
    playlist: VideoPlaylist,
    now = Date.now(),
): PlaylistProgress {
    return {
        playlistId: playlist.id,
        courseId: playlist.courseId,
        sectionId: playlist.sectionId,
        lastVideoId: null,
        lastPositionSec: 0,
        videos: {},
        updatedAt: now,
    };
}

export function isDone(watch: VideoWatch | undefined): boolean {
    return Boolean(watch?.completedAt);
}

/**
 * Records one player tick. `seconds` is the furthest point ever reached, so
 * seeking backwards never loses progress; the resume position is kept apart.
 */
export function applyWatch(
    progress: PlaylistProgress,
    args: {
        videoId: string;
        seconds: number;
        duration: number;
        ended?: boolean;
        now?: number;
    },
): PlaylistProgress {
    const now = args.now ?? Date.now();
    const previous = progress.videos[args.videoId];
    const duration = Math.max(
        previous?.duration ?? 0,
        Math.max(0, Math.round(args.duration || 0)),
    );
    const reported = Math.max(0, Math.round(args.seconds || 0));
    const clamped = duration > 0 ? Math.min(reported, duration) : reported;
    const furthest = Math.max(previous?.seconds ?? 0, clamped);
    const completed =
        Boolean(args.ended) ||
        (duration > 0 && furthest / duration >= COMPLETE_RATIO);

    const watch: VideoWatch = {
        seconds: furthest,
        duration,
        completedAt: previous?.completedAt ?? (completed ? now : null),
        updatedAt: now,
    };

    return {
        ...progress,
        lastVideoId: args.videoId,
        lastPositionSec: completed ? 0 : clamped,
        videos: { ...progress.videos, [args.videoId]: watch },
        updatedAt: now,
    };
}

export function watchState(
    progress: PlaylistProgress,
    lesson: VideoLesson,
): WatchState {
    const watch = progress.videos[lesson.id];
    if (isDone(watch)) return "done";
    if (watch && watch.seconds > 0) return "active";
    return "new";
}

export function watchPercent(
    progress: PlaylistProgress,
    lesson: VideoLesson,
): number {
    const watch = progress.videos[lesson.id];
    if (!watch) return 0;
    if (watch.completedAt) return 100;
    const duration = watch.duration || lesson.durationSec;
    if (duration <= 0) return 0;
    return Math.min(99, Math.round((watch.seconds / duration) * 100));
}

/** Where to start when the page opens: the last unfinished lesson, else the next one. */
export function resumePoint(
    progress: PlaylistProgress,
    playlist: VideoPlaylist,
): { lesson: VideoLesson; seconds: number } | null {
    const last = playlist.videos.find(
        (lesson) => lesson.id === progress.lastVideoId,
    );
    if (last && !isDone(progress.videos[last.id])) {
        const limit = Math.max(0, (last.durationSec || 0) - 3);
        return {
            lesson: last,
            seconds: Math.min(Math.max(0, progress.lastPositionSec), limit),
        };
    }

    const next = playlist.videos.find(
        (lesson) => !isDone(progress.videos[lesson.id]),
    );
    return next ? { lesson: next, seconds: 0 } : null;
}

export type PlaylistSummary = {
    total: number;
    done: number;
    percent: number;
    watchedSeconds: number;
    next: VideoLesson | null;
};

export function playlistSummary(
    progress: PlaylistProgress,
    playlist: VideoPlaylist,
): PlaylistSummary {
    let done = 0;
    let watchedSeconds = 0;

    for (const lesson of playlist.videos) {
        const watch = progress.videos[lesson.id];
        if (!watch) continue;
        if (watch.completedAt) done += 1;
        watchedSeconds += Math.min(
            watch.seconds,
            watch.duration || lesson.durationSec,
        );
    }

    return {
        total: playlist.videos.length,
        done,
        percent:
            playlist.videos.length > 0
                ? Math.round((done / playlist.videos.length) * 100)
                : 0,
        watchedSeconds,
        next:
            playlist.videos.find((lesson) => !isDone(progress.videos[lesson.id])) ??
            null,
    };
}

/** Guest → cloud migration: keep the furthest progress and the earliest completion. */
export function mergePlaylistProgress(
    a: PlaylistProgress | null,
    b: PlaylistProgress | null,
): PlaylistProgress | null {
    if (!a) return b;
    if (!b) return a;

    const videos: Record<string, VideoWatch> = { ...a.videos };
    for (const [videoId, watch] of Object.entries(b.videos)) {
        const current = videos[videoId];
        if (!current) {
            videos[videoId] = watch;
            continue;
        }
        videos[videoId] = {
            seconds: Math.max(current.seconds, watch.seconds),
            duration: Math.max(current.duration, watch.duration),
            completedAt:
                current.completedAt && watch.completedAt
                    ? Math.min(current.completedAt, watch.completedAt)
                    : (current.completedAt ?? watch.completedAt),
            updatedAt: Math.max(current.updatedAt, watch.updatedAt),
        };
    }

    const newer = (a.updatedAt ?? 0) >= (b.updatedAt ?? 0) ? a : b;
    return {
        playlistId: a.playlistId,
        courseId: a.courseId,
        sectionId: a.sectionId,
        videos,
        lastVideoId: newer.lastVideoId,
        lastPositionSec: newer.lastPositionSec,
        updatedAt: Math.max(a.updatedAt ?? 0, b.updatedAt ?? 0),
    };
}

/** "10:04" (or "1:02:03" for long videos). */
export function formatClock(totalSeconds: number): string {
    const safe = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
