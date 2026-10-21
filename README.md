# GoAbroad

Flashcard web app untuk belajar bahasa asing — mulai dari **Bahasa Jerman A1**, dengan penjadwalan
**FSRS**, audio pelafalan, kuis, statistik, dan arsitektur yang siap ditambah bahasa lain.

> Prinsip produk: **fitur belajar gratis tanpa akun**. Akun hanya dibutuhkan untuk sinkronisasi
> cloud dan fitur **AI** (generate kartu).

---

## Tiga mode

| Mode | Data disimpan di | Butuh akun? | Butuh Firebase? | Butuh API key? |
| --- | --- | --- | --- | --- |
| **Tamu (guest)** — default | `localStorage` browser | ❌ | ❌ | ❌ |
| **Akun (cloud)** | Firestore `/users/{uid}/**` | ✅ | ✅ | ❌ |
| **AI generate** | Firestore (setelah ditinjau) | ✅ | ✅ | ✅ `GEMINI_API_KEY` |

- Tamu bisa langsung membuka `/id/dashboard`, memakai deck Jerman A1 (200 kartu) dan progresnya
  tersimpan di browser.
- Saat tamu mendaftar/masuk, data lokal **dimigrasikan otomatis** ke akun (hanya jika akun cloud
  masih kosong, agar tidak menimpa progres yang sudah ada).
- Dialog AI menampilkan gate login untuk tamu, dan endpoint `/api/ai/generate` menolak request
  tanpa Firebase ID token.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript strict
- Tailwind CSS 4 (token warna di `src/app/globals.css`, dark mode berbasis class)
- next-intl 4 (routing `/[locale]`, `src/proxy.ts`, `next/root-params`)
- Firebase 13 (Auth: Google + email/password, Firestore dengan cache persisten)
- ts-fsrs 5.4.2 (FSRS; lihat catatan versi di bawah)
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
> perangkat lain, dan ingat untuk menghentikannya setelah selesai.

### Mode akun dengan Firebase Emulator (tanpa project cloud)

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
4. Deploy aturan & index: `npm run deploy:rules` (atau tempel `firestore.rules` manual).
5. Tambahkan domain deploy (mis. `*.vercel.app`) ke **Authentication → Settings → Authorized domains**.

### Fitur AI

```bash
GEMINI_API_KEY=...            # server-only
GEMINI_MODEL=gemini-2.5-flash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}   # satu baris JSON
```

- `FIREBASE_SERVICE_ACCOUNT_JSON` dipakai `/api/ai/generate` untuk memverifikasi ID token.
- Tanpa variabel tersebut endpoint mengembalikan **503** dan UI menampilkan pesan "AI belum aktif".
- Limit sederhana: 20 request/user/hari (in-memory, cocok untuk single instance; pindah ke
  Firestore/Redis bila perlu multi-instance).

## Script

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `start` | Build & jalankan production |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next core-web-vitals + TS) |
| `npm test` | Unit test Vitest |
| `npm run seed:validate` | Validasi konten `src/content/de/seed-a1.json` |
| `npm run emulators` | Firebase Emulator Suite (auth + firestore) |
| `npm run deploy:rules` | Deploy `firestore.rules` + `firestore.indexes.json` |

## Struktur

```
src/
  proxy.ts                 # next-intl middleware (Next 16: proxy)
  i18n/                    # routing, request config, navigation helpers
  app/[locale]/
    (auth)/                # login / signup / reset-password
    (app)/                 # dashboard, decks, study, stats, settings (mode tamu & akun)
    api/ai/generate/       # route handler AI (server-only)
  components/              # ui, layout, decks, study, import, ai, stats
  hooks/use-speech.ts      # Web Speech API (de-DE)
  lib/
    store/                 # StudyStore: GuestStore (localStorage) & CloudStore (Firestore)
    srs/fsrs.ts            # scheduler, preview interval, mapping SRS <-> Firestore
    quiz/                  # distractor & grading
    import/csv.ts          # parser + column mapping + dedupe
    data/                  # akses Firestore per koleksi
    validation/            # schema zod
  content/de/seed-a1.json  # starter deck (200 kartu A1)
```

### Model data (mode cloud)

```
users/{uid}                          profil + pengaturan (goal, newPerDay, TTS)
users/{uid}/decks/{deckId}           deck (level, tags, cardCount, source)
users/{uid}/cards/{cardId}           kartu + state FSRS + isNew/dueMs (untuk query)
users/{uid}/reviews/{reviewId}       log review (immutable)
users/{uid}/dailyStats/{YYYY-MM-DD}  counter harian (dipakai streak & heatmap)
```

Index komposit yang dibutuhkan ada di `firestore.indexes.json`:
`(deckId,isNew,dueMs)`, `(deckId,isNew,createdAt)`, `(deckId,createdAt)`,
`(isNew,dueMs)`, `(isNew,createdAt)`, `(deckId,reviewMs)`.

## FSRS

- Parameter: `request_retention 0.9`, `maximum_interval 36500`, `enable_fuzz`, short-term steps
  `1m/10m`, relearning `10m`.
- Satu review = satu `writeBatch`: update kartu + tulis `reviews` + `increment()` `dailyStats`.
- Tamu memakai implementasi identik di `GuestStore`.

## Deployment (Vercel)

Aplikasi ini dimaksudkan untuk berjalan di Vercel, **bukan** sebagai service publik
di mesin lab.

1. Push repo, lalu import di Vercel (Framework preset: **Next.js**, build `npm run build`).
2. Set Environment Variables di Project Settings → Environment Variables:

   | Variable | Scope | Catatan |
   | --- | --- | --- |
   | `NEXT_PUBLIC_FIREBASE_*` | Production + Preview | Di-inline saat build |
   | `GEMINI_API_KEY` | Production | server-only |
   | `GEMINI_MODEL` | Production | opsional |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | Production | server-only, satu baris JSON |

3. Variabel `NEXT_PUBLIC_*` di-*inline* saat build → **redeploy** setelah mengubahnya.
4. Tambahkan domain Vercel (`*.vercel.app` dan domain kustom) ke Firebase Console →
   Authentication → Settings → **Authorized domains**.
5. Deploy rules & index dari mesin lokal: `npm run deploy:rules` (perlu `npx firebase login`).
6. Smoke test di URL production: buka `/id/dashboard` (mode tamu), lalu `/api/ai/generate`
   tanpa token harus **401**.

Jangan menaruh emulator atau `next dev` di server lab sebagai layanan publik: semua port
di project ini dijalankan manual, hanya loopback, dan berhenti dengan `Ctrl+C`.

## Menambah bahasa baru

1. Tambah `src/content/<kode>/seed-*.json`.
2. Daftarkan di `src/content/courses.ts` (`speechLocale`, level, flag).
3. Siapkan loader di `src/lib/data/seedLoader.ts` (atau generalisasi per-course).
4. Tidak ada perubahan skema Firestore: semua koleksi sudah memakai `courseId`.

## Catatan & batasan

- `ts-fsrs` dipin ke **5.4.2** (API `fsrs()`, `createCard`, `repeat`, `next`). v6 masih beta
  dengan API berbeda (`DefaultScheduler`) — migrasi dilakukan setelah stabil.
- Heatmap/streak dihitung dari `dailyStats` (bukan seluruh log review) demi menghemat read.
- Mode tamu terikat ke browser; gunakan Export JSON (Pengaturan) untuk backup manual.
- Google Sign-In memerlukan domain terdaftar di Firebase Auth; di emulator gunakan email/password.
- Deck starter berisi 200 kartu A1; target 300–500 kartu dapat ditambahkan tanpa perubahan kode
  (`npm run seed:validate` untuk memastikan format tetap valid).
