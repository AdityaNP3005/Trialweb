import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonStyles } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/layout/logo";
import { contentCardCount, contentUnits, sectionsForCourse } from "@/lib/content/registry";

function PreviewCard({
    label,
    position,
    word,
    phonetic,
    meaning,
    script,
}: {
    label: string;
    position: string;
    word: string;
    phonetic: string;
    meaning: React.ReactNode;
    script: "latin" | "hanzi";
}) {
    return (
        <article className="panel p-5">
            <div className="flex items-baseline justify-between gap-3">
                <span className="eyebrow">{label}</span>
                <span className="meta">{position}</span>
            </div>
            <p
                className={
                    script === "hanzi"
                        ? "font-cjk mt-5 text-[2.75rem] leading-none tracking-tight"
                        : "display mt-5 text-[2rem] leading-none"
                }
            >
                {word}
            </p>
            <p className={script === "hanzi" ? "meta mt-2 text-accent" : "meta mt-2"}>
                {phonetic}
            </p>
            <div className="tear" />
            <p className="text-[15px] leading-snug">{meaning}</p>
        </article>
    );
}

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

    const routes = [
        {
            id: "de",
            code: "Deutsch",
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
            code: "華語",
            name: t("courseZhName"),
            meta: t("courseZhMeta", {
                books: zhBooks,
                cards: zhCards,
                chapters: zhChapters,
            }),
            badge: t("courseZhBadge"),
        },
    ];

    const steps = [
        { title: t("step1Title"), body: t("step1Body") },
        { title: t("step2Title"), body: t("step2Body") },
        { title: t("step3Title"), body: t("step3Body") },
    ];

    const facts = [
        { title: t("featureSrsTitle"), body: t("featureSrsBody") },
        { title: t("featureAudioTitle"), body: t("featureAudioBody") },
        { title: t("featureProgressTitle"), body: t("featureProgressBody") },
        { title: t("featureMultiTitle"), body: t("featureMultiBody") },
    ];

    return (
        <div className="relative min-h-dvh">
            <header className="sticky top-0 z-30 border-b border-border bg-bg/92 backdrop-blur-sm">
                <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
                    <Logo name={tc("appName")} />
                    <div className="ml-auto flex items-center gap-2">
                        <LocaleSwitcher />
                        <ThemeToggle />
                        <Link
                            href="/login"
                            className="ml-1 hidden font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted transition-colors hover:text-fg sm:inline"
                        >
                            {tn("login")}
                        </Link>
                        <Link href="/signup" className={buttonStyles({ size: "sm" })}>
                            {tn("signup")}
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-5xl px-4 sm:px-6">
                <section className="grid gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:py-20">
                    <div className="animate-rise">
                        <p className="eyebrow">
                            {t("badgeDe")} · {t("badgeZh")}
                        </p>
                        <h1 className="display mt-4 text-[2.5rem] leading-[1.03] tracking-[-0.02em] sm:text-[3.25rem]">
                            {t("heroTitle")}
                        </h1>
                        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
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
                        <p className="meta mt-4">{tc("freeNoAccount")}</p>
                    </div>

                    <div className="animate-rise space-y-3 [animation-delay:80ms]">
                        <PreviewCard
                            label={t("previewDeBadge")}
                            position="01 / 29"
                            word="der Apfel"
                            phonetic="[ˈapfl̩]"
                            meaning={t("previewDeMeaning")}
                            script="latin"
                        />
                        <PreviewCard
                            label={t("previewZhBadge")}
                            position="03 / 40"
                            word="週末"
                            phonetic="zhōumò"
                            meaning={t("previewZhMeaning")}
                            script="hanzi"
                        />
                    </div>
                </section>

                <section className="py-10">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
                        <h2 className="eyebrow text-fg">{t("coursesTitle")}</h2>
                        <p className="text-xs text-muted">{t("coursesSubtitle")}</p>
                    </div>

                    <ul>
                        {routes.map((route) => (
                            <li key={route.id}>
                                <Link
                                    href="/dashboard"
                                    className="group grid items-center gap-x-6 gap-y-2 border-b border-border py-5 transition-colors hover:bg-surface-2/40 sm:grid-cols-[6rem_1fr_auto]"
                                >
                                    <span
                                        className={
                                            route.id === "zh"
                                                ? "font-cjk text-lg text-route"
                                                : "font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-route"
                                        }
                                    >
                                        {route.code}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="display text-xl leading-tight">
                                            {route.name}
                                        </p>
                                        <p className="meta mt-1.5">{route.meta}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge tone="neutral">{route.badge}</Badge>
                                        <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-fg" />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="border-b border-border py-10">
                    <h2 className="eyebrow text-fg">{t("howTitle")}</h2>
                    <ol className="mt-5 grid gap-6 sm:grid-cols-3 sm:gap-8">
                        {steps.map((step, index) => (
                            <li key={step.title} className="border-t border-border pt-3">
                                <span className="num font-mono text-[11px] text-accent">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                <h3 className="mt-2 text-sm font-semibold">{step.title}</h3>
                                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                                    {step.body}
                                </p>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="grid gap-x-8 gap-y-6 py-10 sm:grid-cols-2">
                    {facts.map((fact) => (
                        <div key={fact.title} className="border-t border-border pt-3">
                            <h2 className="text-sm font-semibold">{fact.title}</h2>
                            <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
                                {fact.body}
                            </p>
                        </div>
                    ))}
                </section>
            </main>

            <footer className="border-t border-border">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-1.5 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="meta">
                        {tc("appName")} · {tc("tagline")}
                    </p>
                    <p className="meta">{t("footerNote")}</p>
                </div>
            </footer>
        </div>
    );
}
