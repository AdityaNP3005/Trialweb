"use client";

import { useTranslations } from "next-intl";
import type { ReviewRating } from "@/types";
import type { IntervalPreview } from "@/lib/srs/fsrs";
import { cn } from "@/lib/utils/cn";

const order: ReviewRating[] = [1, 2, 3, 4];

const styles: Record<ReviewRating, string> = {
    1: "border-danger/30 bg-danger/10 text-danger hover:bg-danger/15",
    2: "border-warning/30 bg-warning/10 text-warning hover:bg-warning/15",
    3: "border-success/30 bg-success/10 text-success hover:bg-success/15",
    4: "border-accent/30 bg-accent-soft text-accent hover:bg-accent/20",
};

export function RatingBar({
    preview,
    onRate,
    disabled,
}: {
    preview: IntervalPreview;
    onRate: (rating: ReviewRating) => void;
    disabled?: boolean;
}) {
    const t = useTranslations("study");
    const labels: Record<ReviewRating, string> = {
        1: t("again"),
        2: t("hard"),
        3: t("good"),
        4: t("easy"),
    };

    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {order.map((rating) => (
                <button
                    key={rating}
                    type="button"
                    disabled={disabled}
                    onClick={() => onRate(rating)}
                    className={cn(
                        "flex flex-col items-center gap-0.5 rounded-xl border px-3 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                        styles[rating],
                    )}
                >
                    <span className="text-sm">{labels[rating]}</span>
                    <span className="text-[10px] font-medium opacity-80">
                        {preview[rating].label} · {rating}
                    </span>
                </button>
            ))}
        </div>
    );
}
