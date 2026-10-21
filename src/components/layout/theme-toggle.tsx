"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils/cn";

const options: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
];

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme();

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-lg border border-border bg-surface p-0.5",
                className,
            )}
            role="group"
            aria-label="Theme"
        >
            {options.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    type="button"
                    title={label}
                    aria-label={label}
                    aria-pressed={theme === value}
                    onClick={() => setTheme(value)}
                    className={cn(
                        "rounded-md p-1.5 transition",
                        theme === value
                            ? "bg-accent text-accent-fg"
                            : "text-muted hover:text-fg",
                    )}
                >
                    <Icon className="size-3.5" />
                </button>
            ))}
        </div>
    );
}
