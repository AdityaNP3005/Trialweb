"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "goabroad.theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function applyTheme(resolved: ResolvedTheme) {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("system");
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
            setThemeState(stored);
        }
        setReady(true);
    }, []);

    useEffect(() => {
        if (!ready) return;

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const sync = () => {
            const next = theme === "system" ? systemTheme() : theme;
            setResolvedTheme(next);
            applyTheme(next);
        };

        sync();
        if (theme !== "system") return;
        media.addEventListener("change", sync);
        return () => media.removeEventListener("change", sync);
    }, [theme, ready]);

    const setTheme = useCallback((next: Theme) => {
        setThemeState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
    }, []);

    const value = useMemo(
        () => ({ theme, resolvedTheme, setTheme }),
        [theme, resolvedTheme, setTheme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used inside <ThemeProvider>");
    }
    return context;
}
