"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PlaylistProgress, VideoLesson, VideoPlaylist } from "@/types";
import { useStore } from "@/components/providers/store-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { cn } from "@/lib/utils/cn";
import {
    applyWatch,
    emptyPlaylistProgress,
    formatClock,
    playlistSummary,
    resumePoint,
    watchPercent,
    watchState,
} from "@/lib/video/progress";
import { YoutubePlayer, type PlayerProgress } from "./youtube-player";
import { VideoLessonRow } from "./video-lesson-row";

const AUTOPLAY_KEY = "goabroad.video.autoplay";
const SAVE_EVERY_MS = 15_000;

/**
 * Playback hub for one playlist: the player, the resume state and the lesson
 * list. Progress is mirrored to the store every 15s, on pause, on completion
 * and when switching lessons, so closing the tab never loses more than a few
 * seconds.
 */
export function VideoHub({
    playlist,
    sectionLabel,
}: {
    playlist: VideoPlaylist;
    sectionLabel: string;
}) {
    const { store } = useStore();
    const t = useTranslations("video");

    const [progress, setProgress] = useState<PlaylistProgress | null>(null);
    const [activeId, setActiveId] = useState<string>(playlist.videos[0]?.id ?? "");
    const [startAt, setStartAt] = useState(0);
    const [tick, setTick] = useState<PlayerProgress>({ seconds: 0, duration: 0 });
    const [autoplay, setAutoplay] = useState(true);

    const progressRef = useRef<PlaylistProgress | null>(null);
    const lastSaveRef = useRef(0);
    const activeIdRef = useRef(activeId);
    activeIdRef.current = activeId;

    const active =
        playlist.videos.find((lesson) => lesson.id === activeId) ?? playlist.videos[0];

    const summary = useMemo(
        () =>
            progress
                ? playlistSummary(progress, playlist)
                : {
                    total: playlist.videos.length,
                    done: 0,
                    percent: 0,
                    watchedSeconds: 0,
                    next: playlist.videos[0] ?? null,
                },
        [progress, playlist],
    );

    const resume = useMemo(
        () => (progress ? resumePoint(progress, playlist) : null),
        [progress, playlist],
    );

    useEffect(() => {
        setAutoplay(window.localStorage.getItem(AUTOPLAY_KEY) !== "0");
    }, []);

    // Load stored progress once, then open the resume point.
    useEffect(() => {
        if (!store) return;
        let cancelled = false;
        (async () => {
            const stored = await store
                .getVideoProgress(playlist.id)
                .catch(() => null);
            if (cancelled) return;
            const next = stored ?? emptyPlaylistProgress(playlist);
            progressRef.current = next;
            setProgress(next);
            const point = resumePoint(next, playlist);
            const lesson = point?.lesson ?? playlist.videos[0];
            if (lesson) {
                setActiveId(lesson.id);
                setStartAt(point?.seconds ?? 0);
            }
            lastSaveRef.current = Date.now();
        })();
        return () => {
            cancelled = true;
        };
    }, [store, playlist]);

    function flush(next: PlaylistProgress) {
        lastSaveRef.current = Date.now();
        void store?.saveVideoProgress(next).catch(() => { });
    }

    function record(value: PlayerProgress, options: { ended?: boolean; save?: boolean }) {
        const current = progressRef.current;
        if (!current) return;
        const next = applyWatch(current, {
            videoId: activeIdRef.current,
            seconds: value.seconds,
            duration: value.duration,
            ended: options.ended,
        });
        progressRef.current = next;
        setProgress(next);

        const justCompleted =
            !current.videos[activeIdRef.current]?.completedAt &&
            Boolean(next.videos[activeIdRef.current]?.completedAt);
        const due = Date.now() - lastSaveRef.current > SAVE_EVERY_MS;
        if (options.save || justCompleted || due) flush(next);
    }

    function handleProgress(value: PlayerProgress) {
        setTick(value);
        record(value, {});
    }

    function handlePause(value: PlayerProgress) {
        setTick(value);
        record(value, { save: true });
    }

    function handleEnded(value: PlayerProgress) {
        record(value, { ended: true, save: true });
        const index = playlist.videos.findIndex((lesson) => lesson.id === activeIdRef.current);
        const next = playlist.videos[index + 1];
        if (autoplay && next) select(next);
    }

    function select(lesson: VideoLesson) {
        const current = progressRef.current;
        if (current && activeIdRef.current !== lesson.id) {
            flush(current);
        }
        const watch = current?.videos[lesson.id];
        const resumeSeconds = watch?.completedAt
            ? 0
            : Math.min(watch?.seconds ?? 0, Math.max(0, lesson.durationSec - 3));
        setActiveId(lesson.id);
        setStartAt(resumeSeconds);
        setTick({ seconds: resumeSeconds, duration: lesson.durationSec });
    }

    function toggleAutoplay(next: boolean) {
        setAutoplay(next);
        window.localStorage.setItem(AUTOPLAY_KEY, next ? "1" : "0");
    }

    function reset() {
        if (!window.confirm(t("resetBody"))) return;
        const next = emptyPlaylistProgress(playlist);
        progressRef.current = next;
        setProgress(next);
        flush(next);
        const first = playlist.videos[0];
        if (first) {
            setActiveId(first.id);
            setStartAt(0);
            setTick({ seconds: 0, duration: first.durationSec });
        }
    }

    const currentPercent = active
        ? progress
            ? watchPercent(progress, active)
            : 0
        : 0;

    return (
        <div className="space-y-6">
            <PageHeader
                back={{ href: `/levels/${playlist.sectionId}`, label: t("back") }}
                eyebrow={`${sectionLabel} · ${playlist.channel}`}
                title={t("title")}
                description={t("subtitle")}
                meta={[
                    { label: t("metaVideos"), value: String(summary.total) },
                    {
                        label: t("metaDone"),
                        value: `${summary.done}/${summary.total}`,
                    },
                    {
                        label: t("metaWatched"),
                        value: formatClock(summary.watchedSeconds),
                    },
                ]}
                actions={
                    <Button variant="ghost" size="sm" onClick={reset}>
                        <RotateCcw className="size-3.5" />
                        {t("reset")}
                    </Button>
                }
            />

            <div>
                <div className="flex items-baseline justify-between gap-2">
                    <span className="meta">
                        {t("progressLine", {
                            done: summary.done,
                            total: summary.total,
                        })}
                    </span>
                    <span className="num text-sm font-semibold">{summary.percent}%</span>
                </div>
                <Progress value={summary.percent} className="mt-2" />
            </div>

            <section className="panel overflow-hidden">
                <YoutubePlayer
                    videoId={active?.id ?? ""}
                    startAt={startAt}
                    title={active?.title ?? playlist.title}
                    onProgress={handleProgress}
                    onPause={handlePause}
                    onEnded={handleEnded}
                    onReady={(duration) =>
                        setTick((value) => ({ ...value, duration: duration || value.duration }))
                    }
                />

                <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                            <p className="eyebrow">
                                {t("lessonLabel", { number: active?.lesson ?? 1 })}
                            </p>
                            <h2 className="display mt-1 text-xl leading-tight">
                                {active?.title ?? playlist.title}
                            </h2>
                            <p className="meta mt-1.5">
                                {formatClock(active?.durationSec ?? 0)} ·{" "}
                                {playlist.channel}
                            </p>
                        </div>
                        <a
                            href={`https://www.youtube.com/watch?v=${active?.id ?? ""}&list=${playlist.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
                        >
                            {t("openOnYoutube")}
                            <ExternalLink className="size-3.5" />
                        </a>
                    </div>

                    <Progress value={currentPercent} tone="accent" className="mt-4" />

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-[11px] text-muted">
                            <input
                                type="checkbox"
                                checked={autoplay}
                                onChange={(event) => toggleAutoplay(event.target.checked)}
                                className="accent-[var(--accent)]"
                            />
                            {t("autoplay")}
                        </label>
                        <span className="meta num">
                            {formatClock(tick.seconds)} /{" "}
                            {formatClock(tick.duration || active?.durationSec || 0)}
                        </span>
                    </div>
                </div>
            </section>

            <section className="space-y-3">
                <SectionHeading
                    hint={
                        resume
                            ? t("resumeHint", { title: resume.lesson.title })
                            : t("allDone")
                    }
                >
                    {t("lessonsTitle")}
                </SectionHeading>

                <ul className="border-t border-border">
                    {playlist.videos.map((lesson) => (
                        <VideoLessonRow
                            key={lesson.id}
                            lesson={lesson}
                            state={progress ? watchState(progress, lesson) : "new"}
                            percent={progress ? watchPercent(progress, lesson) : 0}
                            active={lesson.id === activeId}
                            onSelect={() => select(lesson)}
                        />
                    ))}
                </ul>
            </section>

            <p className={cn("text-xs text-muted")}>{t("guestNote")}</p>
        </div>
    );
}
