import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { IBM_Plex_Mono, Inter, Source_Serif_4 } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "../globals.css";

const sans = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-sans-face",
});

const display = Source_Serif_4({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-display-face",
    weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "500"],
    display: "swap",
    variable: "--font-plex-mono",
});

const themeScript = `(function(){try{var t=localStorage.getItem("goabroad.theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var r=t==="dark"||(t!=="light"&&d);document.documentElement.classList.toggle("dark",r);document.documentElement.style.colorScheme=r?"dark":"light";}catch(e){}})();`;

type LayoutProps = {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
    params,
}: Omit<LayoutProps, "children">): Promise<Metadata> {
    const { locale } = await params;
    if (!hasLocale(routing.locales, locale)) {
        return {};
    }

    const t = await getTranslations({ locale, namespace: "common" });

    return {
        title: {
            default: `${t("appName")} - ${t("tagline")}`,
            template: `%s · ${t("appName")}`,
        },
        description: t("tagline"),
        applicationName: t("appName"),
    };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
    const { locale } = await params;
    if (!hasLocale(routing.locales, locale)) notFound();

    return (
        <html lang={locale} suppressHydrationWarning>
            <body
                className={`${sans.variable} ${display.variable} ${plexMono.variable} min-h-dvh bg-bg text-fg antialiased`}
            >
                <Script id="theme-bootstrap" strategy="beforeInteractive">
                    {themeScript}
                </Script>
                <NextIntlClientProvider>
                    <ThemeProvider>{children}</ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
