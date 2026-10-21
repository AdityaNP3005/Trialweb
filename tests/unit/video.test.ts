import { describe, expect, it } from "vitest";
import type { VideoPlaylist } from "@/types";
import {
    COMPLETE_RATIO,
    applyWatch,
    emptyPlaylistProgress,
    formatClock,
    isDone,
    mergePlaylistProgress,
    playlistSummary,
    resumePoint,
    watchPercent,
    watchState,
} from "@/lib/video/progress";

const playlist: VideoPlaylist = {
    id: "PL-test",
    courseId: "de",
    sectionId: "A1",
    title: "A1 Course",
    channel: "Learn German",
    channelUrl: "https://www.youtube.com/@LearnGermanOriginal",
    videos: [
        { id: "aaa", lesson: 1, title: "Greetings", durationSec: 600 },
        { id: "bbb", lesson: 2, title: "Numbers", durationSec: 300 },
        { id: "ccc", lesson: 3, title: "Verbs", durationSec: 200 },
    ],
};

function fresh() {
    return emptyPlaylistProgress(playlist, 1_000);
}

describe("applyWatch", () => {
    it("keeps the furthest point when the learner seeks backwards", () => {
        const once = applyWatch(fresh(), {
            videoId: "aaa",
            seconds: 300,
            duration: 600,
            now: 2_000,
        });
        const twice = applyWatch(once, {
            videoId: "aaa",
            seconds: 120,
            duration: 600,
            now: 3_000,
        });

        expect(twice.videos.aaa.seconds).toBe(300);
        expect(twice.lastPositionSec).toBe(120);
        expect(watchPercent(twice, playlist.videos[0])).toBe(50);
    });

    it("marks a lesson complete at the completion ratio", () => {
        const partial = applyWatch(fresh(), {
            videoId: "aaa",
            seconds: Math.floor(600 * (COMPLETE_RATIO - 0.05)),
            duration: 600,
            now: 2_000,
        });
        expect(isDone(partial.videos.aaa)).toBe(false);
        expect(watchState(partial, playlist.videos[0])).toBe("active");

        const done = applyWatch(partial, {
            videoId: "aaa",
            seconds: Math.ceil(600 * COMPLETE_RATIO),
            duration: 600,
            now: 3_000,
        });
        expect(isDone(done.videos.aaa)).toBe(true);
        expect(watchState(done, playlist.videos[0])).toBe("done");
        expect(watchPercent(done, playlist.videos[0])).toBe(100);
        expect(done.lastPositionSec).toBe(0);
    });

    it("treats ENDED as complete and never loses the first completion time", () => {
        const ended = applyWatch(fresh(), {
            videoId: "bbb",
            seconds: 10,
            duration: 300,
            ended: true,
            now: 5_000,
        });
        expect(ended.videos.bbb.completedAt).toBe(5_000);

        const rewatched = applyWatch(ended, {
            videoId: "bbb",
            seconds: 40,
            duration: 300,
            ended: true,
            now: 9_000,
        });
        expect(rewatched.videos.bbb.completedAt).toBe(5_000);
        expect(rewatched.videos.bbb.updatedAt).toBe(9_000);
    });

    it("never stores seconds beyond the reported duration", () => {
        const odd = applyWatch(fresh(), {
            videoId: "ccc",
            seconds: 999,
            duration: 200,
            now: 2_000,
        });
        expect(odd.videos.ccc.seconds).toBe(200);
    });

    it("does not mutate the progress object it receives", () => {
        const before = fresh();
        applyWatch(before, {
            videoId: "aaa",
            seconds: 100,
            duration: 600,
            now: 2_000,
        });
        expect(before.videos).toEqual({});
        expect(before.lastVideoId).toBeNull();
    });
});

describe("resumePoint", () => {
    it("resumes the last active lesson a few seconds before the end", () => {
        let progress = applyWatch(fresh(), {
            videoId: "aaa",
            seconds: 600,
            duration: 600,
            ended: true,
            now: 2_000,
        });
        progress = applyWatch(progress, {
            videoId: "bbb",
            seconds: 120,
            duration: 300,
            now: 3_000,
        });

        const point = resumePoint(progress, playlist);
        expect(point?.lesson.id).toBe("bbb");
        expect(point?.seconds).toBe(120);
    });

    it("keeps the last active lesson instead of jumping to the first unfinished one", () => {
        const progress = applyWatch(fresh(), {
            videoId: "ccc",
            seconds: 20,
            duration: 200,
            now: 2_000,
        });
        const point = resumePoint(progress, playlist);
        expect(point?.lesson.id).toBe("ccc");
        expect(point?.seconds).toBe(20);
    });

    it("starts from the first unfinished lesson when nothing was played yet", () => {
        expect(resumePoint(fresh(), playlist)?.lesson.id).toBe("aaa");
    });

    it("returns null when everything is finished", () => {
        let progress = fresh();
        for (const lesson of playlist.videos) {
            progress = applyWatch(progress, {
                videoId: lesson.id,
                seconds: lesson.durationSec,
                duration: lesson.durationSec,
                ended: true,
            });
        }
        expect(resumePoint(progress, playlist)).toBeNull();
    });
});

describe("playlistSummary", () => {
    it("counts finished lessons and sums watched seconds", () => {
        let progress = applyWatch(fresh(), {
            videoId: "aaa",
            seconds: 600,
            duration: 600,
            ended: true,
        });
        progress = applyWatch(progress, {
            videoId: "bbb",
            seconds: 60,
            duration: 300,
        });

        const summary = playlistSummary(progress, playlist);
        expect(summary.total).toBe(3);
        expect(summary.done).toBe(1);
        expect(summary.percent).toBe(33);
        expect(summary.watchedSeconds).toBe(660);
        expect(summary.next?.id).toBe("bbb");
    });
});

describe("mergePlaylistProgress", () => {
    it("keeps the furthest progress and the earliest completion", () => {
        const guest = applyWatch(emptyPlaylistProgress(playlist, 1_000), {
            videoId: "aaa",
            seconds: 300,
            duration: 600,
            now: 2_000,
        });
        const cloud = applyWatch(emptyPlaylistProgress(playlist, 1_500), {
            videoId: "aaa",
            seconds: 580,
            duration: 600,
            now: 4_000,
        });

        const merged = mergePlaylistProgress(guest, cloud);
        expect(merged?.videos.aaa.seconds).toBe(580);
        expect(merged?.videos.aaa.completedAt).toBeTruthy();
        expect(merged?.updatedAt).toBe(4_000);
    });

    it("takes the newer device as the resume source", () => {
        const older = applyWatch(emptyPlaylistProgress(playlist, 1_000), {
            videoId: "aaa",
            seconds: 100,
            duration: 600,
            now: 2_000,
        });
        const newer = applyWatch(emptyPlaylistProgress(playlist, 1_000), {
            videoId: "bbb",
            seconds: 50,
            duration: 300,
            now: 5_000,
        });

        const merged = mergePlaylistProgress(older, newer);
        expect(merged?.lastVideoId).toBe("bbb");
        expect(merged?.lastPositionSec).toBe(50);
        expect(Object.keys(merged?.videos ?? {}).sort()).toEqual(["aaa", "bbb"]);
    });

    it("passes through when one side is missing", () => {
        const only = fresh();
        expect(mergePlaylistProgress(only, null)).toBe(only);
        expect(mergePlaylistProgress(null, only)).toBe(only);
        expect(mergePlaylistProgress(null, null)).toBeNull();
    });
});

describe("formatClock", () => {
    it("formats under an hour and over an hour", () => {
        expect(formatClock(0)).toBe("0:00");
        expect(formatClock(604)).toBe("10:04");
        expect(formatClock(3_723)).toBe("1:02:03");
    });
});
