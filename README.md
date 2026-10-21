# GoAbroad

Flashcard web app untuk belajar bahasa asing — mulai dari **Bahasa Jerman A1 sampai C2**
(9.688 kartu dalam **177 topik**), dengan engine **siklus per topik**: pilih **band** (A1–C2),
lalu pilih **topik** (mis. "Sapaan & perkenalan"). Satu sesi menyelesaikan satu topik penuh,
kartu dijawab **Ulangi** atau **Sudah paham**, dan topik direset otomatis setelah semua kartunya
ditampilkan. Band tidak pernah dicampur dalam satu sesi.

> Prinsip produk: **fitur belajar gratis tanpa akun**. Akun hanya dibutuhkan untuk sinkronisasi
> cloud dan fitur **AI** (generate kartu).

---

## Tiga mode

| Mode | Data disimpan di | Butuh akun? | Butuh Firebase? | Butuh API key? |
| --- | --- | --- | --- | --- |
| **Tamu (guest)** — default | `localStorage` browser | ❌ | ❌ | ❌ |
| **Akun (cloud)** | Firestore `/users/{uid}/**` | ✅ | ✅ | ❌ |
| **AI generate** | Firestore (setelah ditinjau) | ✅ | ✅ | ✅ `GEMINI_API_KEY` |

- Deck A1–C2 **dibundel di aplikasi**. Firestore hanya menyimpan progres per akun
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

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript strict
- Tailwind CSS 4 (token warna di `src/app/globals.css`, dark mode berbasis class)
- next-intl 4 (routing `/[locale]`, `src/proxy.ts`, `next/root-params`)
- Firebase 13 (Auth: Google + email/password, Firestore dengan cache persisten)
- Zod, PapaParse, Vitest

## Menjalankan

Runtime Node dipasang **privat** di dalam project (`.node/`), tidak menyentuh Node sistem:

```bash
source ./activate.sh          # menambah .node/bin ke PATH (Node 24)
npm install                   # dependency lokal di ./node_modules

cp .env.example .env.local    # opsional: hanya perlu untuk mode akun/AI
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

### Fitur AI

```bash
GEMINI_API_KEY=...            # server-only
GEMINI_MODEL=gemini-2.5-flash # opsional
```

- `/api/ai/generate` memverifikasi Firebase ID token memakai JWKS publik Google (`jose`),
  jadi tidak perlu service account. Cukup `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.
- Tanpa `GEMINI_API_KEY` endpoint mengembalikan **503** dan UI menampilkan pesan "AI belum aktif".
- Limit sederhana: 20 request/user/hari (in-memory; pindah ke Firestore/Redis bila multi-instance).

## Konten Jerman A1–C2

Deck dibundel dari data terbuka (lihat [`NOTICE.md`](./NOTICE.md)) dan dipecah menjadi topik:

| Band | Topik | Kartu | Topik pertama |
| --- | --- | --- | --- |
| A1 | 16 | 600 | Sapaan & perkenalan, Angka & waktu |
| A2 | 27 | 1.200 | Angka & waktu, Kata fungsi & penghubung |
| B1 | 32 | 1.800 | Pekerjaan & ekonomi, Media & teknologi |
| B2 | 33 | 2.000 | Pekerjaan & ekonomi, Hukum & kriminal |
| C1 | 40 | 2.400 | Hukum & kriminal, Media & teknologi |
| C2 | 29 | 1.688 | Pendidikan & ilmu, Masyarakat & politik |

Topik tambahan di luar tema lama: **Kata fungsi & penghubung**, **Orang & profesi**,
**Nomina abstrak**, **Alam & hewan**, **Tempat & geografi**, **Benda & teknologi**,
**Hukum & kriminal**, dan **Olahraga & hobi**. Klasifikasi memakai kata kunci Jerman,
arti Indonesia, lalu aturan sufiks (`-ung`, `-heit`, `-schaft`, `-platz`, `-zeug`, …).
**Nama diri** (negara, kota, nama orang) dibuang lewat `scripts/content/proper-names.json`
+ aturan "arti sama dengan lemma".

- `src/content/manifest.json` = level → topik berurutan (id, ikon, jumlah kartu, file).
- `src/content/de/{a1..c2}.json` = daftar topik + semua kartu level itu (tiap kartu punya `topic`).
- `scripts/content/topics.json` + `topic-id-keywords.json` = definisi topik dan kata kunci
(Jerman dan Indonesia) untuk mengklasifikasikan kartu.
- Dedupe lintas level: satu lemma hanya muncul di level terendah (dijaga validator).
- ID topik `de-a1-greetings`, ID kartu `de-a1-greetings-0001` — **stabil dan hanya append**,
karena progres pengguna merujuk ke ID ini.
- `src/content/migration-map.json` memetakan ID lama (`de-a1-core-0001`) ke ID topik baru.

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

## Script

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `start` | Build & jalankan production |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next core-web-vitals + TS) |
| `npm test` | Unit test Vitest (engine sesi, kuis, CSV, streak) |
| `npm run content:build` | Bangun deck A1–C2 dari data terbuka |
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
    api/ai/generate/       # route handler AI (server-only)
  components/              # ui, layout, decks, study, import, ai, stats
  hooks/use-speech.ts      # Web Speech API (de-DE)
  lib/
    study/session.ts       # engine siklus: buildSession, insertRepeat, cycleProgress
    content/registry.ts    # manifest topik + loader per level
    data/                  # akses Firestore per koleksi (cards, decks, progress, ...)
    quiz/ import/ validation/ stats/
  content/
    manifest.json          # level → topik berurutan
    de/a1.json … c2.json   # topik + kartu per level
    de/source/curated-a1.json
    migration-map.json     # id kartu lama → id topik
scripts/
  content/{topics.json,topic-id-keywords.json,build-decks.py}
  validate-content.ts      # validator konten
```

### Model data (mode cloud)

```
users/{uid}                          profil + bands (ukuran sesi per level) + TTS
users/{uid}/progress/{cardId}        status kartu: known, repeat count, cycle, timestamp
users/{uid}/deckCycles/{deckId}      cursor, cycle, knownInCycle, pendingCardIds
users/{uid}/decks/{deckId}           deck buatan sendiri (opsional)
users/{uid}/cards/{cardId}           kartu deck buatan sendiri / hasil impor / AI
users/{uid}/reviews/{reviewId}       log jawaban (repeat/next)
users/{uid}/dailyStats/{YYYY-MM-DD}  counter harian (streak & heatmap)
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
   | `GEMINI_API_KEY` | Production | server-only |
   | `GEMINI_MODEL` | Production | opsional |

3. `NEXT_PUBLIC_*` di-*inline* saat build → **redeploy** setelah mengubahnya. Repo ini sudah
   menyertakan `.env.production` dengan konfigurasi web Firebase publik, jadi build produksi
   selalu punya config meski dashboard kosong.
4. Tambahkan domain Vercel ke Firebase Console → Authentication → Settings → **Authorized domains**.
5. Deploy rules & index: `npm run deploy:rules`.
6. Smoke test: `/id/login` menampilkan form login, `/api/ai/generate` tanpa token → **401**
   (atau **503** bila `GEMINI_API_KEY` belum diisi).

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
