# GoAbroad

Flashcard web app untuk belajar bahasa asing — mulai dari **Bahasa Jerman A1 sampai C2**
(10.200 kartu), dengan engine **siklus per level**: kamu menentukan berapa kartu per sesi untuk
tiap band CEFR, setiap kartu dijawab **Ulangi** atau **Sudah paham**, dan putaran baru dimulai
otomatis setelah semua kartu pernah ditampilkan.

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

1. **Pengaturan → Belajar**: tentukan jumlah kartu per sesi untuk tiap level (5–100, default 20)
   dan opsional acak urutan.
2. Mulai sesi dari dashboard/deck. Sesi mengambil kartu dari deck level tersebut sesuai urutan
   (atau acak), dimulai dari posisi terakhir.
3. Setiap kartu: **Ulangi** (kartu muncul lagi ±3 kartu kemudian, tidak menambah slot sesi) atau
   **Sudah paham** (dihitung selesai untuk putaran ini).
4. Kartu yang masih "Ulangi" saat sesi berakhir masuk daftar pending dan ditampilkan lebih dulu
   pada sesi berikutnya.
5. Ketika semua kartu deck sudah pernah ditampilkan dan tidak ada pending, siklus **reset
   otomatis**: `Putaran 2` dimulai dari kartu pertama dan hitungan "paham" kembali 0.
6. Progres per deck (putaran, x/y paham, pending) tampil di dashboard dan halaman Deck; tombol
   "Mulai ulang putaran" ada di detail deck.

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

Deck dibundel dari data terbuka (lihat [`NOTICE.md`](./NOTICE.md) untuk atribusi & lisensi):

| Deck | Kartu | Sumber |
| --- | --- | --- |
| `de-a1-core` | 600 | 200 kartu kurasi manual + 400 kata paling sering (Wikdict) |
| `de-a2-core` | 1.200 | frekuensi kata + terjemahan Wikdict |
| `de-b1-core` | 1.800 | idem |
| `de-b2-core` | 2.000 | idem |
| `de-c1-core` | 2.400 | idem |
| `de-c2-core` | 2.200 | idem |

- `src/content/manifest.json` = daftar deck (id, file, level, jumlah kartu).
- `src/content/de/source/curated-a1.json` = 200 kartu A1 kurasi (punya artikel & contoh kalimat).
- Dedupe lintas level: satu lemma hanya muncul di level terendah (dijaga oleh validator).
- ID kartu stabil (`de-a1-core-0001`) dan hanya boleh *append*, karena progres pengguna
  merujuk ke ID tersebut.

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
    study/progress.ts      # default & normalisasi pengaturan band
    store/                 # StudyStore: GuestStore (localStorage v2) & CloudStore
    content/registry.ts    # manifest deck + loader statis
    data/                  # akses Firestore per koleksi (cards, decks, progress, ...)
    quiz/ import/ validation/ stats/
  content/
    manifest.json          # daftar deck bundel
    de/a1-core.json … c2-core.json
    de/source/curated-a1.json
scripts/
  content/build-decks.py   # pipeline data terbuka
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

Versi lama menyimpan `srs` + `isNew/dueMs` di setiap kartu yang disalin ke akun. Saat login
pertama setelah upgrade, `migrateLegacyEngine()` membuat dokumen `progress` + `deckCycles`
(kartu yang pernah direview dianggap "paham"), lalu menandai profil `engineV2: true`. Dokumen
kartu lama dibiarkan apa adanya sebagai jaring aman (tidak lagi dibaca aplikasi).

Snapshot tamu generasi lama (`goabroad.guest.v1`) juga dimigrasikan ke `goabroad.guest.v2`.

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

- Membuka sesi langsung memajukan posisi (cursor) deck, karena kartu yang ditampilkan dianggap
  sudah "diperkenalkan" pada putaran itu. Kalau sesi ditinggalkan, kartu tersebut tidak
  dihitung paham dan akan muncul lagi pada putaran berikutnya.
- Artikel/gender kata benda dan contoh kalimat belum tersedia untuk kartu hasil pipeline
  (hanya 200 kartu A1 kurasi). Lihat peringatan `npm run seed:validate`.
- Pembagian level A2–C2 diambil dari peringkat frekuensi, bukan daftar resmi Goethe/ÖSD
  (daftar resmi berhak cipta). Anggap sebagai perkiraan yang berguna, bukan sertifikasi.
- Heatmap/streak dihitung dari `dailyStats` (bukan seluruh log) demi menghemat read.
- Mode tamu terikat ke browser; gunakan Export JSON (Pengaturan) untuk backup manual.
- Google Sign-In memerlukan domain terdaftar di Firebase Auth.
