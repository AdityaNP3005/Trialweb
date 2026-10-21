type UnitNoun = "band" | "book";
type Translator = (key: string, values?: Record<string, number>) => string;

/**
 * Bundled content stores one title per unit ("Sapaan & perkenalan", "Buku 1").
 * The UI localizes those generic titles at render time so the English build
 * never shows Indonesian labels. Topic titles are mapped below; book/chapter
 * labels come from the message catalog.
 */
const englishTitles: Record<string, string> = {
    "Sapaan & kesantunan": "Greetings & courtesy",
    "Keluarga & hubungan pribadi": "Family & personal relationships",
    "Perjalanan, transportasi & arah": "Travel, transport & directions",
    "Rumah & kegiatan rumah tangga": "Home & household activities",
    "Pakaian, penampilan & belanja": "Clothing, appearance & shopping",
    "Warna, bentuk & ukuran": "Colours, shapes & sizes",
    "Tubuh & pancaindra": "Body & senses",
    "Kesehatan & perawatan": "Health & care",
    "Bangunan, kota & tempat umum": "Buildings, cities & public places",
    "Geografi, negara & bahasa": "Geography, countries & languages",
    "Alam, hewan & tumbuhan": "Nature, animals & plants",
    "Lingkungan, cuaca & geologi": "Environment, weather & geology",
    "Pekerjaan, uang & ekonomi": "Work, money & economy",
    "Pendidikan, sains & pengetahuan": "Education, science & knowledge",
    "Seni, hiburan & budaya": "Art, entertainment & culture",
    "Agama, mitologi & kepercayaan": "Religion, mythology & beliefs",
    "Hukum, kejahatan & keselamatan": "Law, crime & safety",
    "Militer, perang & persenjataan": "Military, war & weapons",
    "Masyarakat, negara & politik": "Society, government & politics",
    "Media, komunikasi digital & teknologi": "Media, digital communication & technology",
    "Olahraga, permainan & hobi": "Sports, games & hobbies",
    "Perasaan, pikiran & sikap": "Feelings, thoughts & attitudes",
    "Bahasa, percakapan & tulisan": "Language, conversation & writing",
    "Perkakas & benda sehari-hari": "Tools & everyday objects",
    "Bahan, zat & satuan ukur": "Materials, substances & measurements",
    "Orang, identitas & profesi": "People, identities & professions",
    "Kata fungsi, penghubung & keterangan": "Function words, connectors & adverbs",
    "Tindakan & kata kerja umum": "Actions & general verbs",
    "Sifat & keadaan umum": "General qualities & states",
    "Konsep, proses & hubungan abstrak": "Abstract concepts, processes & relationships",
    "Alam & hewan": "Nature & animals",
    "Angka, tanggal & waktu": "Numbers, dates & time",
    "Arah & tempat": "Directions & places",
    "Benda & teknologi": "Objects & technology",
    "Budaya & seni": "Culture & art",
    "Hukum & kriminal": "Law & crime",
    "Kata fungsi & penghubung": "Function words & connectors",
    "Kata kerja dasar": "Basic verbs",
    "Kata kerja lanjutan": "Advanced verbs",
    "Kata sifat dasar": "Basic adjectives",
    "Kata sifat lanjutan": "Advanced adjectives",
    "Keluarga & orang": "Family & people",
    "Kerja & sekolah": "Work & school",
    "Kesehatan & psikologi": "Health & psychology",
    "Kosakata umum": "General vocabulary",
    "Lingkungan & alam": "Environment & nature",
    "Makanan & minuman": "Food & drink",
    "Media & teknologi": "Media & technology",
    "Nomina abstrak": "Abstract nouns",
    "Olahraga & hobi": "Sports & hobbies",
    "Orang & profesi": "People & professions",
    "Pakaian & belanja": "Clothing & shopping",
    "Pekerjaan & ekonomi": "Jobs & economy",
    "Pendidikan & ilmu": "Education & science",
    "Perjalanan & transportasi": "Travel & transport",
    "Rumah & benda sehari-hari": "Home & everyday objects",
    "Sapaan & perkenalan": "Greetings & introductions",
    "Tempat & geografi": "Places & geography",
    "Tubuh & kesehatan": "Body & health",
    "Warna & bentuk": "Colours & shapes",
};

/** Translates a topic title, keeping the "(1/4)" split suffix. */
export function localizedUnitName(name: string, locale: string): string {
    if (!locale.startsWith("en")) return name;
    const match = /^(.*?)(\s*\(\d+\/\d+\))?$/.exec(name);
    const base = (match?.[1] ?? name).trim();
    const suffix = match?.[2] ?? "";
    const translated = englishTitles[base];
    return translated ? `${translated}${suffix}` : name;
}

/** "Buku 1" / "Book 1" for textbooks, or the band label ("A1"). */
export function sectionLabelFor(
    level: string,
    unitNoun: UnitNoun,
    t: Translator,
): string {
    const match = unitNoun === "book" ? /^book(\d+)$/.exec(level) : null;
    return match ? t("sectionLabel", { count: Number(match[1]) }) : level;
}

export function unitLabelFor(
    order: number | undefined,
    fallback: string,
    unitNoun: UnitNoun,
    t: Translator,
    locale = "id",
): string {
    if (unitNoun === "book" && order) return t("chapterLabel", { count: order });
    return localizedUnitName(fallback, locale);
}
