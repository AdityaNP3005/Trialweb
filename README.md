# GoAbroad

Flashcard web app untuk belajar bahasa asing — **Bahasa Jerman A1–C2** (9.483 kartu dalam
**228 topik**) dan **Mandarin tradisional** dari buku *當代中文課程* (2.891 kartu dalam
**54 bab**, Buku 1–4). Engine-nya sama: pilih **band/buku**, lalu pilih **topik/bab**.
Satu sesi menyelesaikan satu unit penuh, kartu dijawab **Ulangi** atau **Sudah paham**, dan
unit direset otomatis setelah semua kartunya ditampilkan.

> Prinsip produk: **semua fitur belajar gratis tanpa akun**. Akun hanya dipakai untuk
> menyimpan progres (sinkron antar perangkat + backup cloud).

Identitas visualnya **dokumen perjalanan**: kertas krem, tinta, satu merah stempel, garis
rambut dan perforasi menggantikan kartu bershadow. Band/buku diperlakukan sebagai *rute*,
topik/bab sebagai *perhentian*, unit yang tuntas mendapat *stempel*. Detail token,
tipografi, dan aturan komponen ada di [`docs/DESIGN.md`](./docs/DESIGN.md).

📄 **Dokumentasi lengkap:** [`docs/PRD.md`](./docs/PRD.md) (kebutuhan produk, acceptance
criteria, roadmap), [`docs/BRIEFING.md`](./docs/BRIEFING.md) (status teknis terkini,
invariant, gotchas, TODO — baca ini dulu sebelum mengubah kode), dan
[`docs/DESIGN.md`](./docs/DESIGN.md) (sistem visual: token, tipografi, komponen,
checklist UI).

---

## Tiga mode

| Mode | Data disimpan di | Butuh akun? | Butuh Firebase? |
| --- | --- | --- | --- |
| **Tamu (guest)** — default | `localStorage` browser | ❌ | ❌ |
| **Akun (cloud)** | Firestore `/users/{uid}/**` | ✅ | ✅ |

- Akun dipakai **hanya untuk menyimpan progres**: sinkron antar perangkat dan backup
  cloud. Tidak ada fitur lain yang dikunci di balik akun.
- Deck semua bahasa **dibundel di aplikasi**. Firestore hanya menyimpan progres per akun
  (`progress/{cardId}` + `deckCycles/{deckId}`), bukan salinan kartu — jadi menambah level baru
  tidak menambah biaya tulis per akun.
- Tamu bisa langsung membuka `/id/dashboard`; progresnya tersimpan di browser dan ikut
  dimigrasikan otomatis saat pertama kali login ke akun yang masih kosong.

## Cara belajar

1. **Dashboard → Pilih band**: 6 kartu band menampilkan progres gabungan, jumlah topik, dan
topik yang harus dilanjutkan. Tidak ada tombol "Mulai sesi".
2. Halaman band (`/levels/A1` … `/levels/C2`) menampilkan **daftar topik berurutan** dari yang
paling umum ke khusus. Urutan topik berbeda untuk setiap band.
3. Buka satu topik → sesi berisi **seluruh kartu topik itu** (maksimal 80 kartu per topik).
4. Setiap kartu: **Ulangi** (`1`/`R`) atau **Sudah paham** (`2`/`N`). Kartu yang diulang muncul
lagi ±3 kartu kemudian dan tetap "pending" sampai dijawab paham.
5. Setelah semua kartu topik ditampilkan dan tidak ada pending, siklus topik **reset otomatis**
(`Putaran 2`) dan hitungan paham kembali 0. Tombol "Mulai ulang topik" tersedia di daftar topik.
6. Progres tampil per topik (x/y paham, putaran, pending), per band, dan di Statistik.

Keyboard: `Space` untuk membuka jawaban, `1`/`R` untuk Ulangi, `2`/`N` untuk Sudah paham,
`Q` untuk berganti flashcard/kuis.

## Mandarin tradisional (buku 1–4)

Course kedua memakai struktur **Buku → Bab** (tanpa topik/subbab) dengan acuan kosakata
*當代中文課程* (A Course in Contemporary Chinese). Kartu: depan **Hanzi**, belakang **pinyin**,
arti **Inggris** dan **Indonesia**.

| Buku | Bab | Kartu |
| --- | --- | --- |
| Buku 1 | 15 | 520 |
| Buku 2 | 15 | 618 |
| Buku 3 | 12 | 804 |
| Buku 4 | 12 | 949 |
| **Total** | **54** | **2.891** |

- Sumber kosakata diekspor dari buku (tidak di-commit; letakkan di `.content-cache/acc/pleco_dangdai.tsv`).
- Nama orang (tokoh dialog, tokoh sejarah) dibuang; nama tempat/negara dipertahankan karena diajarkan di bab.
- Duplikat `hanzi|pinyin` diambil kemunculan pertama, sisanya dicatat di `src/content/zh/report.json`.
- Gloss Inggris diringkas (tag POS & catatan panjang dibuang), arti Indonesia ditulis sendiri di
  `scripts/content/zh/en-id-*.tsv` + `id-glosses.jsonl`.
- Audio memakai **Web Speech API** (`zh-TW`), jadi tidak ada berkas audio buku yang di-host.

```bash
npm run content:zh        # bangun src/content/zh/book1..4.json + manifest + report
npm run content:zh -- --require-id   # gagal bila ada kartu tanpa arti Indonesia
```

Loader buku terdaftar di `src/lib/content/registry.ts`. Setelah menambah buku baru, tambahkan
loader + entri manifest (dihasilkan otomatis oleh script) lalu jalankan `npm run seed:validate`.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript strict
- Tailwind CSS 4 (token warna di `src/app/globals.css`, dark mode berbasis class)
- Font lewat `next/font/google`: Source Serif 4 (display), Inter (UI), IBM Plex Mono
  (metadata). Hanzi memakai Noto Sans TC yang di-self-host lewat `next/font`
  (`--font-cjk`), dipecah per unicode-range sehingga hanya potongan yang dipakai
  yang diunduh — glyph Traditional yang jelas, bukan font sistem yang bisa jatuh ke
  bentuk Jepang.
- next-intl 4 (routing `/[locale]`, `src/proxy.ts`, `next/root-params`)
- Firebase 13 (Auth: Google + email/password, Firestore dengan cache persisten)
- Zod, PapaParse, Vitest

## Menjalankan

Runtime Node dipasang **privat** di dalam project (`.node/`), tidak menyentuh Node sistem:

```bash
source ./activate.sh          # menambah .node/bin ke PATH (Node 24)
npm install                   # dependency lokal di ./node_modules

cp .env.example .env.local    # opsional: hanya perlu untuk mode akun
npm run dev                   # http://127.0.0.1:3000 (loopback saja)
```

Tanpa `.env.local` pun aplikasi tetap jalan dalam **mode tamu**.

> `npm run dev` sengaja di-bind ke `127.0.0.1` agar tidak membuka port ke jaringan
> mesin lab. Gunakan `npm run dev:network` **hanya** jika memang perlu diakses dari
> perangkat lain, dan hentikan setelah selesai.

### Mode akun dengan Firebase Emulator

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-goabroad.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-goabroad
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:demo
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=1

npm run emulators   # Auth :9099, Firestore :8080, UI :4000
npm run dev
```

### Mode akun dengan Firebase asli

1. Buat project di [Firebase Console](https://console.firebase.google.com/), tambahkan Web App.
2. Aktifkan **Authentication → Sign-in method**: Google dan Email/Password.
3. Isi variabel `NEXT_PUBLIC_FIREBASE_*` di `.env.local`.
4. Deploy aturan & index: `npm run deploy:rules`.
5. Tambahkan domain deploy (mis. `*.vercel.app`) ke **Authentication → Settings → Authorized domains**.

### Fitur tanpa akun

Semua fitur belajar (deck bawaan, sesi, kuis, statistik) berjalan tanpa login. Akun hanya
menambah penyimpanan progres di cloud:

- Progres tamu disimpan di `localStorage` dan ikut dimigrasikan ke akun saat pertama login
  (jika akun masih kosong).
- Setelah login, progres tersinkron antar perangkat dan otomatis di-backup di Firestore.

## Konten Jerman A1–C2

Deck dibundel dari data terbuka (lihat [`NOTICE.md`](./NOTICE.md)) dan dipecah menjadi topik:

| Band | Topik | Kartu | Topik pertama |
| --- | --- | --- | --- |
| A1 | 33 | 534 | Sapaan & perkenalan, Angka & waktu |
| A2 | 34 | 1.146 | Angka & waktu, Kata fungsi & penghubung |
| B1 | 37 | 1.758 | Pekerjaan & ekonomi, Media & teknologi |
| B2 | 40 | 1.983 | Pekerjaan & ekonomi, Hukum & kriminal |
| C1 | 47 | 2.383 | Hukum & kriminal, Media & teknologi |
| C2 | 37 | 1.679 | Pendidikan & ilmu, Masyarakat & politik |

Topik tambahan di luar tema lama: **Kata fungsi & penghubung**, **Orang & profesi**,
**Nomina abstrak**, **Alam & hewan**, **Tempat & geografi**, **Benda & teknologi**,
**Hukum & kriminal**, dan **Olahraga & hobi**. Klasifikasi memakai kata kunci Jerman,
arti Indonesia, lalu aturan sufiks (`-ung`, `-heit`, `-schaft`, `-platz`, `-zeug`, …).
**Nama diri** (negara, kota, nama orang) dibuang lewat `scripts/content/proper-names.json`
+ aturan "arti sama dengan lemma".

- `src/content/manifest.json` = level → topik berurutan (id, ikon, jumlah kartu, file).
- `src/content/de/{a1..c2}.json` = daftar topik + semua kartu level itu (tiap kartu punya `topic`).
- `scripts/content/topics.json` = katalog topik: kata kunci Jerman, kata kunci arti Indonesia
(`idKeywords`), aturan sufiks, `fallbackWordTypes`, dan urutan topik per band (`orders`).
- `scripts/content/proper-names.json` = blocklist nama diri (negara, kota, nama orang).
- Dedupe lintas level: satu lemma hanya muncul di level terendah (dijaga validator).
- ID topik `de-a1-greetings`, ID kartu `de-a1-greetings-0001` — **stabil dan hanya append**,
karena progres pengguna merujuk ke ID ini.
- `src/content/migration-map.json` (id kartu lama `de-a1-core-0001` → id topik v3) dan
`src/content/topic-map.json` (id topik v3 → id topik v4) dipakai saat migrasi progres.

Membangun ulang konten:

```bash
mkdir -p .content-cache
curl -o .content-cache/de-id.sqlite3 https://download.wikdict.com/dictionaries/sqlite/2_2026-06/de-id.sqlite3
curl -o .content-cache/de-en.sqlite3 https://download.wikdict.com/dictionaries/sqlite/2_2026-06/de-en.sqlite3
curl -o .content-cache/de_50k.txt https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt
npm run content:build      # scripts/content/build-decks.py
npm run seed:validate      # schema, duplikat lintas level, jumlah kartu vs manifest
```

Setelah menambah deck: daftarkan loader-nya di `src/lib/content/registry.ts`
(import statis) dan tambahkan entri manifest (script build melakukannya otomatis).

## Materi video (A1)

Playlist **A1 (Free Course) | Learn German for beginners** dari kanal *Learn German*
(66 pelajaran) bisa ditonton langsung di dalam aplikasi. Video tetap diputar dari YouTube
lewat IFrame API — tidak ada salinan atau hosting video di repo ini — dan **tidak butuh API key**.

- Buka dari menu **Video**, dari tombol di halaman band A1, atau dari baris progres di dashboard.
- Tiap akun (dan mode tamu) menyimpan sisa tontonan per pelajaran: posisi terakhir untuk
  melanjutkan, dan titik terjauh untuk menandai selesai (92% durasi atau video habis).
- Pelajaran yang selesai dicap `SELESAI`; pelajaran berikutnya auto-play (bisa dimatikan).
- Progres tamu ikut dipindahkan ke akun saat login (`videosV1`).

Manifest dibundel sebagai JSON agar judul/durasi tidak diambil saat runtime:

```
src/content/de/videos/a1.json   # playlistId, kanal, 66 {id, lesson, title, durationSec}
```

Menambah band lain = tambahkan `src/content/de/videos/<band>.json` dengan bentuk yang sama,
import di `src/lib/content/videos.ts`, lalu tautkan dari halaman band-nya. Tidak ada perubahan
skema Firestore (`users/{uid}/videoPlaylists/{playlistId}` sudah generik).

## Script

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `start` | Build & jalankan production |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next core-web-vitals + TS) |
| `npm test` | Unit test Vitest (engine sesi, kuis, CSV, streak) |
| `npm run content:build` | Bangun deck Jerman A1–C2 dari data terbuka |
| `npm run content:zh` | Bangun deck Mandarin (buku 1–4) dari ekspor kosakata |
| `npm run seed:validate` | Validasi konten + jumlah kartu vs manifest |
| `npm run emulators` | Firebase Emulator Suite (auth + firestore) |
| `npm run deploy:rules` | Deploy `firestore.rules` + `firestore.indexes.json` |

## Struktur

```
src/
  proxy.ts                 # next-intl middleware (Next 16: proxy)
  i18n/                    # routing, request config, navigation helpers
  app/[locale]/
    (auth)/                # login / signup / reset-password
    (app)/                 # dashboard, decks, study, stats, settings
  components/              # ui, layout, decks, study, import, stats
  hooks/use-speech.ts      # Web Speech API (de-DE)
  lib/
    study/session.ts       # engine siklus: buildSession, insertRepeat, cycleProgress
    content/registry.ts    # manifest topik + loader per level
    data/                  # akses Firestore per koleksi (cards, decks, progress, ...)
    quiz/ import/ validation/ stats/
  content/
    manifest.json          # level → topik berurutan (Jerman)
    de/a1.json … c2.json   # topik + kartu per level
    de/source/curated-a1.json
    migration-map.json     # id kartu lama → id topik v3
    topic-map.json         # id topik v3 → id topik v4
    zh/manifest.json       # buku → bab berurutan (Mandarin)
    zh/book1.json … book4.json
    de/videos/a1.json      # manifest playlist video A1 (66 pelajaran)
scripts/
  content/{topics.json,proper-names.json,build-decks.py}
  content/zh/{build-zh.py,person-names.json,en-id-*.tsv,id-glosses.jsonl}
  validate-content.ts      # validator konten (Jerman + Mandarin)
docs/
  PRD.md                   # kebutuhan produk + acceptance criteria + roadmap
  BRIEFING.md              # status terkini untuk AI/kontributor berikutnya
```

### Model data (mode cloud)

```
users/{uid}                          profil + bands (ukuran sesi per level) + TTS
users/{uid}/progress/{cardId}        status kartu: known, repeat count, cycle, timestamp
users/{uid}/deckCycles/{deckId}      cursor, cycle, knownInCycle, pendingCardIds
users/{uid}/decks/{deckId}           deck buatan sendiri (opsional)
users/{uid}/cards/{cardId}           kartu deck buatan sendiri / hasil impor
users/{uid}/reviews/{reviewId}       log jawaban (repeat/next)
users/{uid}/dailyStats/{YYYY-MM-DD}  counter harian (streak & heatmap)
users/{uid}/videoPlaylists/{playlistId}  progres tontonan: lastVideoId, lastPositionSec,
                                         videos{videoId: {seconds, duration, completedAt, updatedAt}}
```

Index komposit ada di `firestore.indexes.json`: cards `(deckId, createdAt)`,
progress `(deckId)`, reviews `(deckId, createdAt)`.

## Migrasi dari versi FSRS

1. **FSRS → siklus** (`engineV2`): kartu lama yang pernah direview dianggap "paham" dan dipetakan
ke `progress` + `deckCycles`.
2. **Per-level → per-topik** (`topicsV3`/`topicsV4`): `src/lib/data/migrate-topics.ts` memakai
`migration-map.json` (core → topik lama) dan `topic-map.json` (topik lama → topik sekarang).
Kartu yang dulu "paham" dimasukkan sebagai **pending** topik barunya agar tampil dulu, lalu
dokumen progres/cycle lama dihapus. Snapshot tamu (`goabroad.guest.v2`) di-remap saat dibuka.

## Deployment (Vercel)

1. Push repo, lalu import di Vercel (Framework preset: **Next.js**, build `npm run build`).
2. Environment Variables:

   | Variable | Scope | Catatan |
   | --- | --- | --- |
   | `NEXT_PUBLIC_FIREBASE_*` | Production + Preview | Di-inline saat build |

3. `NEXT_PUBLIC_*` di-*inline* saat build → **redeploy** setelah mengubahnya. Repo ini sudah
   menyertakan `.env.production` dengan konfigurasi web Firebase publik, jadi build produksi
   selalu punya config meski dashboard kosong.
4. Tambahkan domain Vercel ke Firebase Console → Authentication → Settings → **Authorized domains**.
5. Deploy rules & index: `npm run deploy:rules`.
6. Smoke test: `/id/login` menampilkan form login, `/id/dashboard` bisa dibuka tanpa akun.

## Menambah bahasa baru

1. Tambah deck di `src/content/<kode>/` dan daftarkan di `src/content/manifest.json`
   (atau lewat pipeline serupa).
2. Tambahkan loader statis di `src/lib/content/registry.ts`.
3. Daftarkan bahasa di `src/content/courses.ts` (`speechLocale`, level, flag).
4. Tidak ada perubahan skema Firestore: semua koleksi memakai `courseId`.

## Catatan & batasan

- Membuka topik langsung memajukan posisi (cursor) topik, karena kartu yang ditampilkan dianggap
sudah "diperkenalkan" pada putaran itu. Kalau sesi ditinggalkan, kartu tersebut tidak dihitung
paham dan akan muncul lagi pada putaran berikutnya.
- Artikel/gender kata benda dan contoh kalimat belum tersedia untuk kartu hasil pipeline
  (hanya 200 kartu A1 kurasi). Lihat peringatan `npm run seed:validate`.
- Pembagian level A2–C2 diambil dari peringkat frekuensi, bukan daftar resmi Goethe/ÖSD
  (daftar resmi berhak cipta). Anggap sebagai perkiraan yang berguna, bukan sertifikasi.
- Heatmap/streak dihitung dari `dailyStats` (bukan seluruh log) demi menghemat read.
- Mode tamu terikat ke browser; gunakan Export JSON (Pengaturan) untuk backup manual.
- Google Sign-In memerlukan domain terdaftar di Firebase Auth.
- Video butuh jaringan dan `youtube-nocookie.com` yang tidak diblokir; bila iframe gagal
dimuat, halaman menampilkan tautan ke YouTube sebagai gantinya. Status `SELESAI` hanya
tercatat setelah pemutar benar-benar diputar.

Audit kosakata Jerman: [hasil dan cara verifikasi](docs/GERMAN-VOCAB-REVIEW.md).

Penataan kategori Deutsch: [laporan dan migrasi topik](docs/GERMAN-TOPICS-REVIEW.md).
