"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type PlayerState = 0 | 1 | 2 | 3 | 5; // unstarted, playing, paused, buffering, cued

type YtPlayer = {
    loadVideoById: (args: { videoId: string; startSeconds?: number }) => void;
    playVideo: () => void;
    pauseVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    destroy: () => void;
};

type YtNamespace = {
    Player: new (
        element: HTMLElement,
        options: {
            videoId: string;
            host?: string;
            playerVars?: Record<string, string | number>;
            events?: {
                onReady?: () => void;
                onStateChange?: (event: { data: PlayerState }) => void;
                onError?: (event: { data: number }) => void;
            };
        },
    ) => YtPlayer;
};

declare global {
    interface Window {
        YT?: YtNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}

let apiPromise: Promise<YtNamespace> | null = null;

/** Loads the IFrame API once per page; reused by every player mount. */
function loadYouTubeApi(): Promise<YtNamespace> {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("no window"));
    }
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;

    apiPromise = new Promise<YtNamespace>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
            'script[src="https://www.youtube.com/iframe_api"]',
        );
        const timeout = window.setTimeout(
            () => reject(new Error("youtube-api-timeout")),
            12_000,
        );

        window.onYouTubeIframeAPIReady = () => {
            window.clearTimeout(timeout);
            if (window.YT?.Player) resolve(window.YT);
            else reject(new Error("youtube-api-missing"));
        };

        if (!existing) {
            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            script.async = true;
            script.onerror = () => {
                window.clearTimeout(timeout);
                reject(new Error("youtube-api-blocked"));
            };
            document.head.appendChild(script);
        }
    }).catch((error) => {
        apiPromise = null;
        throw error;
    });

    return apiPromise;
}

export type PlayerProgress = { seconds: number; duration: number };

/**
 * Thin wrapper around the YouTube IFrame API. The parent decides what to do with
 * progress ticks; this component only reports them and survives re-renders
 * without re-creating the iframe.
 */
export function YoutubePlayer({
    videoId,
    startAt,
    title,
    onProgress,
    onPause,
    onEnded,
    onReady,
    onError,
    className,
}: {
    videoId: string;
    startAt: number;
    title: string;
    onProgress?: (value: PlayerProgress) => void;
    onPause?: (value: PlayerProgress) => void;
    onEnded?: (value: PlayerProgress) => void;
    onReady?: (duration: number) => void;
    onError?: (code: number) => void;
    className?: string;
}) {
    const t = useTranslations("video");
    const hostRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YtPlayer | null>(null);
    const tickerRef = useRef<number | null>(null);
    const pendingRef = useRef<{ videoId: string; startAt: number } | null>({
        videoId,
        startAt,
    });
    const loadedRef = useRef<{ videoId: string; startAt: number } | null>(null);
    const handlers = useRef({ onProgress, onPause, onEnded, onReady, onError });

    const [failed, setFailed] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        handlers.current = { onProgress, onPause, onEnded, onReady, onError };
    }, [onProgress, onPause, onEnded, onReady, onError]);

    function read(): PlayerProgress {
        const player = playerRef.current;
        if (!player) return { seconds: 0, duration: 0 };
        try {
            return {
                seconds: Math.max(0, player.getCurrentTime() || 0),
                duration: Math.max(0, player.getDuration() || 0),
            };
        } catch {
            return { seconds: 0, duration: 0 };
        }
    }

    function stopTicker() {
        if (tickerRef.current !== null) {
            window.clearInterval(tickerRef.current);
            tickerRef.current = null;
        }
    }

    function startTicker() {
        stopTicker();
        tickerRef.current = window.setInterval(() => {
            handlers.current.onProgress?.(read());
        }, 1000);
    }

    // Create the player once.
    useEffect(() => {
        let cancelled = false;

        loadYouTubeApi()
            .then((YT) => {
                if (cancelled || !hostRef.current || playerRef.current) return;
                const first = pendingRef.current;
                pendingRef.current = null;
                loadedRef.current = {
                    videoId: first?.videoId ?? videoId,
                    startAt: first?.startAt ?? startAt,
                };

                playerRef.current = new YT.Player(hostRef.current, {
                    videoId: first?.videoId ?? videoId,
                    host: "https://www.youtube-nocookie.com",
                    playerVars: {
                        enablejsapi: 1,
                        playsinline: 1,
                        rel: 0,
                        modestbranding: 1,
                        start: Math.floor(first?.startAt ?? startAt),
                    },
                    events: {
                        onReady: () => {
                            if (cancelled) return;
                            setReady(true);
                            handlers.current.onReady?.(read().duration);
                        },
                        onStateChange: (event) => {
                            const state = event.data;
                            if (state === 1) {
                                startTicker();
                            } else if (state === 2) {
                                stopTicker();
                                handlers.current.onPause?.(read());
                            } else if (state === 0) {
                                stopTicker();
                                handlers.current.onEnded?.(read());
                            }
                        },
                        onError: (event) => {
                            stopTicker();
                            setFailed(true);
                            handlers.current.onError?.(event.data);
                        },
                    },
                });
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });

        return () => {
            cancelled = true;
            stopTicker();
            try {
                playerRef.current?.destroy();
            } catch {
                // Ignore teardown errors.
            }
            playerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Switch video without recreating the iframe.
    useEffect(() => {
        const player = playerRef.current;
        if (!player || !ready) {
            pendingRef.current = { videoId, startAt };
            return;
        }
        if (
            loadedRef.current?.videoId === videoId &&
            Math.abs(loadedRef.current.startAt - startAt) < 2
        ) {
            return;
        }
        stopTicker();
        setFailed(false);
        loadedRef.current = { videoId, startAt };
        try {
            player.loadVideoById({
                videoId,
                startSeconds: Math.max(0, Math.floor(startAt)),
            });
            handlers.current.onReady?.(read().duration);
        } catch {
            setFailed(true);
        }
    }, [videoId, startAt, ready]);

    if (failed) {
        return (
            <div
                className={cn(
                    "flex aspect-video w-full flex-col items-center justify-center gap-2 border-b border-border px-6 text-center",
                    className,
                )}
            >
                <p className="text-sm font-semibold">{t("embedError")}</p>
                <a
                    href={`https://www.youtube.com/watch?v=${videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent underline-offset-4 hover:underline"
                >
                    {t("openOnYoutube")}
                    <ExternalLink className="size-3.5" />
                </a>
            </div>
        );
    }

    return (
        <div className={cn("relative aspect-video w-full border-b border-border", className)}>
            <div className="absolute inset-0">
                <div
                    ref={hostRef}
                    title={title}
                    className="size-full [&>iframe]:size-full [&>iframe]:border-0"
                />
            </div>
            {!ready ? (
                <div className="pointer-events-none absolute inset-0 grid place-items-center bg-surface-2/60">
                    <span className="flex items-center gap-2 text-xs font-semibold text-muted">
                        <Play className="size-4" />
                        {t("loading")}
                    </span>
                </div>
            ) : null}
        </div>
    );
}
