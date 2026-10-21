# DESIGN — identitas visual GoAbroad

Dokumen ini mengikat keputusan visual supaya tampilan tidak melenceng kembali ke
"template SaaS" (kartu rounded + shadow + warna ungu) saat ada penambahan fitur.

## Konsep: dokumen perjalanan

Belajar bahasa = perjalanan. Section (band/buku) adalah **rute**, unit (topik/bab)
adalah **perhentian**, satu sesi adalah **keberangkatan**, dan unit yang tuntas
mendapat **stempel**. Identitasnya struktural, bukan skeuomorfik: garis rambut,
perforasi, monospace untuk data, serif untuk judul.

Aturan inti:

1. **Garis dan ruang kosong yang mengelompokkan**, bukan kartu mengambang. `panel`
   hanya untuk blok yang memang satu objek (kartu sesi, dialog, pass card).
2. **Satu aksen.** Merah stempel dipakai untuk status/penanda, bukan untuk dekorasi.
3. **Angka selalu tabular** (`.num`, `.meta`) supaya kolom progres tidak bergoyang.
4. **Stempel lurus untuk teks.** Kemiringan (`stamp--tilt`) hanya dekorasi.

## Token (`src/app/globals.css`)

| Token | Light | Dark | Dipakai untuk |
| --- | --- | --- | --- |
| `--bg` | krem `oklch(.972 .012 88)` | navy-hitam `oklch(.19 .012 250)` | kertas halaman |
| `--surface` | kertas terang | panel malam | panel, dialog |
| `--surface-2` | krem gelap | navy terang | inset, hover |
| `--border` | garis rambut | garis rambut | semua aturan |
| `--fg` | tinta `oklch(.23 .014 70)` | kertas `oklch(.95 .008 90)` | teks, tombol utama |
| `--muted` | tinta pudar | kertas pudar | metadata |
| `--accent` | vermilion `oklch(.51 .16 27)` | vermilion terang | stempel, underline aktif |
| `--route` | hijau paspor | hijau paspor terang | kode rute (Deutsch/華語) |
| `--success` / `--warning` / `--danger` | hijau zaitun / amber / merah | versi terang | status |

Nama variabel lama (`bg`, `surface`, `border`, `fg`, `muted`, `accent`, …)
dipertahankan agar kelas Tailwind yang sudah ada tetap bekerja; **nilainya** yang
diganti. Jangan menambah warna baru di luar tabel ini.

## Tipografi

| Peran | Font | Kelas |
| --- | --- | --- |
| Judul, angka besar, label section | Source Serif 4 (600) | `display` |
| Teks UI | Inter | default `font-sans` |
| Metadata, kode rute, keycap | IBM Plex Mono | `meta`, `eyebrow`, `font-mono` |
| Hanzi | Noto Sans TC (self-host, `next/font`) | `font-cjk font-medium` |

- **Hanzi tidak pernah memakai `display`.** Source Serif 4 tidak punya glif CJK;
  setiap stack (`sans`, `display`, `mono`) jatuh ke `var(--font-cjk-face)` supaya
  hanzi selalu memakai Noto Sans TC bentuk Traditional, bukan font sistem (yang di
  sebagian mesin berupa serif Jepang/Song dan sulit dikenali).
- **Kenapa bukan Fraunces/Inter Tight**: garis Fraunces bernuansa WONK dan `J` yang
  turun ke bawah baseline terbaca ambigu di ukuran display; Inter Tight terlalu rapat
  untuk teks kecil. Source Serif 4 + Inter menjaga karakter editorial tapi jelas.
- `.eyebrow` = mono 11px, tracking `0.16em`, uppercase, muted. Dipakai untuk label
  section, bukan untuk setiap judul.
- `.meta` = mono 11px, tracking `0.06em`, tabular. Untuk hitungan dan status.
- Hanya tiga ukuran judul: 3xl (header halaman), xl (header sesi/dialog), lg (kartu).

## Komponen

- `PageHeader` (`components/ui/page-header.tsx`): eyebrow → judul display → deskripsi
  → baris meta (`dl`) → garis bawah. Semua halaman memakai pola yang sama.
- `SectionHeading`: label mono + hint opsional + aksi.
- `ManifestRow`: nomor unit mono, judul, stempel status, garis progres, chevron.
  Baris dipisah hairline; aksi tambahan (reset) dirender **di luar** anchor.
- `Badge` = stempel paspor: border 1.5px `currentColor`, mono uppercase, radius 2px.
- `Progress`: bar 3px. `RouteProgress`: garis rute + titik (dipakai bila butuh
  posisi, bukan sekadar persentase).
- `Button`: primer = blok tinta (`bg-fg text-bg`), sekunder = garis, ghost = teks.
  Tidak ada gradient, tidak ada bayangan tebal.
- `.tear` / `.tear-flat`: garis putus-putus dengan notches (kartu sesi) atau tanpa
  notches (panel yang tepinya inset).
- `Logo` + `LogoMark`: cincin stempel dengan rute putus-putus dan satu titik aksen.

### Halaman video

- Pemutar duduk di dalam satu `.panel` tanpa bayangan: iframe `aspect-video` full-bleed,
  lalu footer info di bawahnya dipisah `border-t` (judul pelajaran, nomor mono, durasi,
  tautan "buka di YouTube", toggle auto-play, jam tonton).
- Pelajaran memakai baris hairline seperti `ManifestRow`: nomor mono 2 digit, judul,
  stempel status (`SELESAI` / `SEDANG` / `BARU`, plus stempel emas "diputar").
- Progres playlist dirender sebagai satu `Progress` 3px di bawah `PageHeader`, dengan
  hitungan `n/total` dan total menit sebagai `.meta`.
- Tidak ada thumbnail YouTube: manifest tidak menyimpan gambar, dan permintaan thumbnail
  per baris akan membuat 66 request pihak ketiga.

## Gerak

- 150–180 ms, `cubic-bezier(.2,.7,.3,1)`. `animate-rise` untuk konten masuk,
  `animate-stamp` untuk stempel.
- `prefers-reduced-motion` mematikan animasi (sudah di `globals.css`).
- Kartu sesi tidak berubah tinggi saat reveal, jadi tidak ada layout shift.

## Pelokalan label konten

Konten dibundel menyimpan **satu** judul per unit (`Buku 1`, `Bab 3`, `Sapaan &
perkenalan`). UI menerjemahkannya saat render:

- `src/lib/content/labels.ts`
  - `sectionLabelFor(level, unitNoun, t)` → "Buku 1" / "Book 1" / "A1"
  - `unitLabelFor(order, fallback, unitNoun, t, locale)` → "Bab 3" / "Chapter 3",
    dan untuk band memakai `localizedUnitName()` yang memetakan 30 judul topik
    Jerman ke bahasa Inggris.
- Jangan menampilkan `deck.name` atau `section.label` langsung di UI; selalu lewat
  helper di atas.

## Checklist sebelum menambah UI

- [ ] Apakah blok ini butuh `panel`, atau cukup hairline + jarak?
- [ ] Semua teks terlihat berasal dari `messages/{id,en}.json` (tidak ada string
      Indonesia/Inggris hardcoded)?
- [ ] Label section/unit lewat `sectionLabelFor` / `unitLabelFor`?
- [ ] Warna hanya dari token; tidak ada hex baru?
- [ ] Hanzi memakai `font-cjk`, bukan `display`?
- [ ] Kontras teks ≥ 4.5:1 di light dan dark?
- [ ] Stempel tidak memiringkan teks status?
- [ ] Sudah dicek di 375px, 768px, 1280px, dua tema, dua locale?
