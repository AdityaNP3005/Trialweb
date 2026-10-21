"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type DialogProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
};

export function Dialog({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    className,
}: DialogProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        panelRef.current?.focus();
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <div
                aria-hidden
                className="absolute inset-0 bg-black/45 backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className={cn(
                    "surface-card animate-rise relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-b-none p-5 sm:max-w-lg sm:rounded-2xl sm:p-6",
                    className,
                )}
            >
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
                        {description ? (
                            <p className="mt-1 text-sm text-muted">{description}</p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
                    >
                        <X className="size-4" />
                    </button>
                </div>
                {children}
                {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
            </div>
        </div>
    );
}
