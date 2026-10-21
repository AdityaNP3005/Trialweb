import {
    ArrowRight,
    AudioLines,
    Brain,
    Flame,
    Languages,
    Sparkles,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonStyles } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default async function LandingPage() {
    const t = await getTranslations("landing");
    const tc = await getTranslations("common");
    const tn = await getTranslations("nav");

    const features = [
        { icon: Brain, title: t("featureSrsTitle"), body: t("featureSrsBody") },
        { icon: AudioLines, title: t("featureAudioTitle"), body: t("featureAudioBody") },
        { icon: Flame, title: t("featureProgressTitle"), body: t("featureProgressBody") },
        { icon: Languages, title: t("featureMultiTitle"), body: t("featureMultiBody") },
    ];

    return (
        <div className="relative min-h-dvh overflow-hidden">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--accent-soft),transparent_70%)]"
            />

            <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
                <div className="flex items-center gap-2 font-bold tracking-tight">
                    <span className="grid size-8 place-items-center rounded-xl bg-accent text-accent-fg">
                        <Sparkles className="size-4" />
                    </span>
                    {tc("appName")}
                </div>
                <div className="flex items-center gap-2">
                    <LocaleSwitcher />
                    <ThemeToggle />
                    <Link
                        href="/login"
                        className={buttonStyles({ variant: "ghost", size: "sm" })}
                    >
                        {tn("login")}
                    </Link>
                    <Link
                        href="/signup"
                        className={buttonStyles({ size: "sm", className: "hidden sm:inline-flex" })}
                    >
                        {tn("signup")}
                    </Link>
                </div>
            </header>

            <main className="relative mx-auto w-full max-w-6xl px-5">
                <section className="grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
                    <div className="animate-rise">
                        <Badge tone="accent" className="mb-5">
                            <span className="mr-1">🇩🇪</span> A1 · Deutsch
                        </Badge>
                        <h1 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
                            {t("heroTitle")}
                        </h1>
                        <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
                            {t("heroSubtitle")}
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <Link href="/dashboard" className={buttonStyles({ size: "lg" })}>
                                {t("ctaPrimary")}
                                <ArrowRight className="size-4" />
                            </Link>
                            <Link
                                href="/login"
                                className={buttonStyles({ variant: "secondary", size: "lg" })}
                            >
                                {t("ctaSecondary")}
                            </Link>
                        </div>
                        <p className="mt-3 text-xs text-muted">{tc("freeNoAccount")}</p>
                    </div>

                    <div className="animate-rise relative mx-auto w-full max-w-sm [animation-delay:120ms]">
                        <div
                            aria-hidden
                            className="absolute -inset-6 -z-10 rounded-[2rem] bg-accent/10 blur-2xl"
                        />
                        <div className="surface-card p-6">
                            <div className="flex items-center justify-between">
                                <Badge tone="neutral">A1 · Makanan</Badge>
                                <span className="text-xs font-medium text-muted">1 / 42</span>
                            </div>
                            <div className="mt-10 text-center">
                                <p className="text-3xl font-extrabold tracking-tight">der Apfel</p>
                                <p className="mt-1 font-mono text-xs text-muted">[ˈapfl̩]</p>
                                <div className="my-6 h-px bg-border" />
                                <p className="text-lg font-semibold">apel · apple</p>
                                <p className="mt-2 text-sm italic text-muted">
                                    „Ich esse einen Apfel.“
                                </p>
                            </div>
                            <div className="mt-8 grid grid-cols-4 gap-2">
                                {["1", "2", "3", "4"].map((key, index) => (
                                    <div
                                        key={key}
                                        className="rounded-xl border border-border bg-surface-2 px-2 py-2 text-center"
                                    >
                                        <span className="block text-[10px] font-bold text-muted">
                                            {key}
                                        </span>
                                        <span className="block text-[10px] text-muted">
                                            {["10m", "1h", "1d", "4d"][index]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
                    {features.map(({ icon: Icon, title, body }) => (
                        <div key={title} className="surface-card p-5">
                            <div className="mb-3 grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
                                <Icon className="size-4" />
                            </div>
                            <h2 className="text-sm font-bold">{title}</h2>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
                        </div>
                    ))}
                </section>
            </main>

            <footer className="relative border-t border-border">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        {tc("appName")} · {tc("tagline")}
                    </p>
                    <p>SRS: FSRS · UI: ID / EN · Courses: DE</p>
                </div>
            </footer>
        </div>
    );
}
