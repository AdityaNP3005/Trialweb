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
import { contentCardCount, contentUnits, sectionsForCourse } from "@/lib/content/registry";

export default async function LandingPage() {
    const t = await getTranslations("landing");
    const tc = await getTranslations("common");
    const tn = await getTranslations("nav");

    const deCards = contentCardCount("de");
    const deTopics = contentUnits.filter((unit) => unit.courseId === "de").length;
    const deBands = sectionsForCourse("de").length;

    const zhCards = contentCardCount("zh");
    const zhChapters = contentUnits.filter((unit) => unit.courseId === "zh").length;
    const zhBooks = sectionsForCourse("zh").length;

    const courseCards = [
        {
            id: "de",
            flag: "🇩🇪",
            name: t("courseDeName"),
            meta: t("courseDeMeta", {
                bands: deBands,
                cards: deCards,
                topics: deTopics,
            }),
            badge: t("courseDeBadge"),
        },
        {
            id: "zh",
            flag: "🇹🇼",
            name: t("courseZhName"),
            meta: t("courseZhMeta", {
                books: zhBooks,
                cards: zhCards,
                chapters: zhChapters,
            }),
            badge: t("courseZhBadge"),
        },
    ];

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
                        <div className="mb-5 flex flex-wrap gap-2">
                            <Badge tone="accent">
                                <span className="mr-1">🇩🇪</span> {t("badgeDe")}
                            </Badge>
                            <Badge tone="accent">
                                <span className="mr-1">🇹🇼</span> {t("badgeZh")}
                            </Badge>
                        </div>
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
                        <div className="surface-card p-5">
                            <div className="flex items-center justify-between">
                                <Badge tone="neutral">{t("previewDeBadge")}</Badge>
                                <span className="text-xs font-medium text-muted">1 / 29</span>
                            </div>
                            <div className="mt-6 text-center">
                                <p className="text-3xl font-extrabold tracking-tight">der Apfel</p>
                                <p className="mt-1 font-mono text-xs text-muted">[ˈapfl̩]</p>
                                <div className="my-4 h-px bg-border" />
                                <p className="text-lg font-semibold">apel · apple</p>
                            </div>
                        </div>

                        <div className="surface-card mt-4 p-5">
                            <div className="flex items-center justify-between">
                                <Badge tone="neutral">{t("previewZhBadge")}</Badge>
                                <span className="text-xs font-medium text-muted">3 / 40</span>
                            </div>
                            <div className="mt-5 text-center">
                                <p className="font-cjk text-4xl font-extrabold tracking-tight">週末</p>
                                <p className="mt-1 font-mono text-xs text-accent">zhōumò</p>
                                <div className="my-4 h-px bg-border" />
                                <p className="text-sm font-semibold">{t("previewZhMeaning")}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="pb-16">
                    <div className="mb-4">
                        <h2 className="text-lg font-extrabold tracking-tight">
                            {t("coursesTitle")}
                        </h2>
                        <p className="mt-1 text-sm text-muted">{t("coursesSubtitle")}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {courseCards.map((course) => (
                            <Link
                                key={course.id}
                                href="/dashboard"
                                className="surface-card group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:border-accent/50"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span
                                            aria-hidden
                                            className="grid size-10 place-items-center rounded-xl bg-accent-soft text-lg"
                                        >
                                            {course.flag}
                                        </span>
                                        <div>
                                            <p className="text-sm font-bold">{course.name}</p>
                                            <p className="mt-0.5 text-[11px] text-muted">
                                                {course.meta}
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" />
                                </div>
                                <Badge tone="neutral" className="w-fit">
                                    {course.badge}
                                </Badge>
                            </Link>
                        ))}
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
                    <p>{t("footerNote")}</p>
                </div>
            </footer>
        </div>
    );
}
