"use client";

const KEYS = ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"];

/** Inserts German letters at the cursor of the given field (for keyboards without them). */
export function UmlautKeys({
    target,
    onInsert,
}: {
    target: () => HTMLInputElement | HTMLTextAreaElement | null;
    onInsert: (value: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1" aria-label="Umlaut">
            {KEYS.map((key) => (
                <button
                    key={key}
                    type="button"
                    // Keep focus (and the cursor position) in the text field.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        const field = target();
                        if (!field) return;
                        const start = field.selectionStart ?? field.value.length;
                        const end = field.selectionEnd ?? field.value.length;
                        const next = field.value.slice(0, start) + key + field.value.slice(end);
                        onInsert(next);
                        requestAnimationFrame(() => field.setSelectionRange(start + 1, start + 1));
                    }}
                    className="h-8 min-w-8 rounded-[0.25rem] border border-border px-2 text-sm transition-colors hover:border-fg/40"
                >
                    {key}
                </button>
            ))}
        </div>
    );
}
