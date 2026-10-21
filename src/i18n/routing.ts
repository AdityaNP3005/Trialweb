import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
    locales: ["id", "en"],
    defaultLocale: "id",
    localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];

export const localeLabels: Record<AppLocale, string> = {
    id: "Bahasa Indonesia",
    en: "English",
};

export const localeShort: Record<AppLocale, string> = {
    id: "ID",
    en: "EN",
};
