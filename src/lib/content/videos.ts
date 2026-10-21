import type { VideoPlaylist } from "@/types";
import deA1 from "@/content/de/videos/a1.json";

/**
 * Bundled video material. Like card content, playlists are committed JSON so the
 * app never scrapes YouTube at runtime and works offline for the manifest.
 * Adding a band = add `src/content/de/videos/<band>.json` and register it here.
 */
const playlists: VideoPlaylist[] = [
    {
        id: deA1.playlistId,
        courseId: deA1.courseId,
        sectionId: deA1.sectionId,
        title: deA1.title,
        channel: deA1.channel,
        channelUrl: deA1.channelUrl,
        videos: deA1.videos,
    },
];

export function videoPlaylist(
    courseId: string,
    sectionId: string,
): VideoPlaylist | null {
    return (
        playlists.find(
            (playlist) =>
                playlist.courseId === courseId && playlist.sectionId === sectionId,
        ) ?? null
    );
}

export function videoPlaylistsForCourse(courseId: string): VideoPlaylist[] {
    return playlists.filter((playlist) => playlist.courseId === courseId);
}

/** Sections of a course that have a playlist, in content order. */
export function videoSections(courseId: string): string[] {
    return videoPlaylistsForCourse(courseId).map((playlist) => playlist.sectionId);
}

export function videoLesson(
    playlist: VideoPlaylist,
    videoId: string | null | undefined,
) {
    if (!videoId) return null;
    return playlist.videos.find((lesson) => lesson.id === videoId) ?? null;
}
