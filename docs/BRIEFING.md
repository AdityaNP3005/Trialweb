# BRIEFING — GoAbroad (untuk AI / kontributor berikutnya)

> Baca ini dulu sebelum menyentuh kode. Isinya **kondisi nyata repo saat ini**, bukan rencana.
> Dokumen kebutuhan lengkap ada di [`PRD.md`](./PRD.md).
> Commit acuan: **`012acb6`** (`main` = `origin/main`) · Produksi: https://goabroad-rho.vercel.app
> Terakhir diverifikasi: **2026-10-21**

---

## 0. Ringkasan 60 detik

Web flashcard bahasa Jerman A1–C2. **Sudah live.** Pengguna memilih band → memilih topik →
satu sesi menyelesaikan seluruh kartu topik itu dengan tombol **Ulangi** / **Sudah paham**;
topik direset otomatis setelah semua kartu tampil (`Putaran 2`). Ada mode tamu (localStorage,
tanpa akun) dan mode akun (Firestore). Konten dibundel statis, **9.688 kartu / 177 topik**.
Sudah ada 3 gelombang migrasi data (FSRS → siklus → topik → topik v4) dan semuanya sudah
dijalankan untuk akun pilot.

---

## 1. Yang sudah selesai (jangan dikerjakan ulang)

| Area | Status | Bukti |
| --- | --- | --- |
| Deploy publik di Vercel (tanpa port lab) | ✅ | `goabroad-rho.vercel.app`, project Vercel `goabroad` |
| Auth (Google + email/password, reset password) | ✅ | Firebase `goabroad-d86fc` |
| Mode tamu penuh fungsi | ✅ | `localStorage` `goabroad.guest.v2` |
| Engine siklus repeat/next + pending | ✅ | `src/lib/study/session.ts`, 34 unit test |
| Deck per topik + pilih band | ✅ | `/dashboard`, `/levels/[level]`, manifest v2 |
| Konten A1–C2 tanpa nama diri | ✅ | 9.688 kartu, 177 topik (commit `012acb6`) |
| Migrasi progres bertahap | ✅ | flag `engineV2`, `topicsV3`, `topicsV4` |
| Deck kustom + impor CSV | ✅ | `papaparse` + `zod`, `/decks` |
| Statistik, streak, heatmap, kuis | ✅ | `/stats`, `dailyStats` |
| **Mandarin tradisional (buku 1–4)** | ✅ | course `zh`, 54 bab, 2.891 kartu, TTS `zh-TW` |

---

## 2. Angka konten saat ini (`012acb6`)

| Band | Topik | Kartu |
| --- | --- | --- |
| A1 | 16 | 600 |
| A2 | 27 | 1.200 |
| B1 | 32 | 1.800 |
| B2 | 33 | 2.000 |
| C1 | 40 | 2.400 |
| C2 | 29 | 1.688 |
| **Total** | **177** | **9.688** |

Sisa "Kosakata umum" per band (indikator kualitas klasifikasi):
A1 119 · A2 452 · B1 903 · B2 1.088 · C1 1.297 · C2 932.

### Mandarin (`zh`) — buku 1–4

| Buku | Bab | Kartu |
| --- | --- | --- |
| Buku 1 | 15 | 520 |
| Buku 2 | 15 | 618 |
| Buku 3 | 12 | 804 |
| Buku 4 | 12 | 949 |

- Hierarki: **Buku → Bab** (satu bab = satu sesi; `L01-I` + `L01-II` digabung).
- Kartu: depan Hanzi, belakang pinyin + Inggris + Indonesia (`Card.pinyin`).
- Sumber: ekspor kosakata di `.content-cache/acc/pleco_dangdai.tsv` (tidak di-commit).
- `npm run content:zh` menulis `src/content/zh/bookN.json`, `manifest.json`, `report.json`.
- Nama orang dibuang (`scripts/content/zh/person-names.json` + pola gloss), tempat dipertahankan.
- Arti Indonesia: `scripts/content/zh/en-id-*.tsv` (gloss Inggris → Indonesia) dan
  `id-glosses.jsonl` (override per hanzi|pinyin). Saat ini 0 kartu tanpa arti Indonesia.
- Buku 5 di file sumber hanya L01–L10 dan **Buku 6 belum ada** → belum dirilis.

Perintah cek cepat:

```bash
cd "/home/cislab301b/Aditya/try web"
python3 -c "
import json
m=json.load(open('src/content/manifest.json'))
for l in m['levels']:
    print(l['level'], len(l['topics']), sum(t['cardCount'] for t in l['topics']))
"
```

---

## 3. Runtime & perintah

Node sistem terlalu tua → pakai Node **privat** di `.node/` (Node 24).

```bash
cd "/home/cislab301b/Aditya/try web"
source ./activate.sh            # atau: export PATH="$PWD/.node/bin:$PATH"
npm install

npm run dev                     # http://127.0.0.1:3000 (loopback saja)
npm run start -- -p 3100        # uji build produksi lokal
pkill -f next-server            # WAJIB setelah selesai
ss -ltnp | grep -E ':3000|:3100|:8080|:4000'   # harus kosong
```

Gate sebelum commit (semua harus hijau):

```bash
npm run typecheck && npm run lint && npm test && npm run seed:validate && npm run build
```

Konten:

```bash
npm run content:build     # python3 scripts/content/build-decks.py (butuh .content-cache/)
npm run content:zh        # python3 scripts/content/zh/build-zh.py (butuh .content-cache/acc/)
npm run seed:validate     # jumlah kartu vs manifest, duplikat lintas band, id/urutan topik
```

Firebase:

```bash
npm run emulators         # auth :9099, firestore :8080, UI :4000 (project demo-goabroad)
npm run deploy:rules      # firestore.rules + firestore.indexes.json
```

---

## 4. Peta file penting

| File | Isi |
| --- | --- |
| `src/app/[locale]/(app)/dashboard/page.tsx` | 6 kartu band + topik terakhir + stat tile |
| `src/app/[locale]/(app)/levels/[level]/page.tsx` | daftar topik berurutan, status, reset topik |
| `src/app/[locale]/(app)/study/[deckId]/page.tsx` | sesi topik (repeat/next, header putaran) |
| `src/app/[locale]/(app)/decks/page.tsx` | ringkasan band + daftar topik + filter tag |
| `src/app/[locale]/(app)/decks/[deckId]/page.tsx` | deck kustom, impor CSV |
| `src/lib/study/session.ts` | `buildSession`, `insertRepeat` (gap 3), `cycleProgress`, `MAX_REPEATS_PER_CARD` |
| `src/lib/data/progress.ts` | `submitAction`: progress + deckCycle + dailyStats + review log (batch) |
| `src/lib/data/migrate-topics.ts` | remap id topik cloud (`migration-map.json` → `topic-map.json`) |
| `src/lib/data/migrate-legacy.ts` | migrasi FSRS → siklus (`engineV2`) |
| `src/lib/store/local-store.ts` | mode tamu, `contentVersion = 4`, `remapTopics()` |
| `src/lib/store/cloud-store.ts` | mode akun, merge topik konten + deck pengguna |
| `src/lib/content/registry.ts` | loader statis per level, `loadContentCards()` (filter `card.topic === topic.key`) |
| `src/content/courses.ts` | `listContentDecks`, `summarizeBand()` |
| `src/content/manifest.json` | v2: level → topik (id, key, title, icon, order, cardCount) |
| `src/content/de/{a1..c2}.json` | topik + kartu; tiap kartu punya `topic` |
| `src/content/migration-map.json` | id kartu lama `de-a1-core-0001` → id topik v3 |
| `src/content/topic-map.json` | id topik v3 → id topik v4 |
| `scripts/content/topics.json` | katalog topik: keyword Jerman, `idKeywords` regex, `suffixes`, `fallbackWordTypes`, `orders` per band |
| `scripts/content/proper-names.json` | blocklist nama diri (negara/kota/nama orang) |
| `scripts/content/build-decks.py` | pipeline build konten |
| `scripts/validate-content.ts` | validator konten (`npm run seed:validate`) |
| `tests/unit/{session,topics,csv,quiz,streak}.test.ts` | 34 test |

---

## 5. Environment & kredensial

- `.env.production` **di-commit** dan hanya berisi konfigurasi web Firebase **publik**
  (`NEXT_PUBLIC_FIREBASE_*`). Jangan tambahkan secret ke file ini.
- Tidak ada secret server. Semua fitur berjalan tanpa API key pihak ketiga.
- Firebase project: `goabroad-d86fc`. Akun pilot: `admin@goabroad.app`
  (**password tidak disimpan di repo** — minta ke pemilik).
- Authorized domain Firebase harus memuat `goabroad-rho.vercel.app` agar Google Sign-In jalan.
- `NEXT_PUBLIC_*` di-inline saat build → ubah env berarti **redeploy**, bukan restart.

---

## 6. Invariant — jangan dilanggar

1. **ID kartu/topik stabil & hanya append.** Progres pengguna merujuk ke ID. Renumber = data hilang.
2. **Konten tidak disalin ke Firestore per akun** (kecuali deck kustom). Firestore hanya progres.
   Menambah satu band baru tidak boleh menambah biaya tulis per pengguna.
3. **Satu sesi = satu topik.** Jangan campur band/topik dalam satu sesi.
4. **Dev/start hanya loopback** (`127.0.0.1`). Ini server lab; port tidak boleh terbuka.
   `npm run dev:network` hanya bila benar-benar perlu.
5. **Tanpa `firebase-admin` dan tanpa API/LLM eksternal.** Semua fitur berjalan di klien +
   Firestore; jangan tambah dependency server baru untuk "mempermudah".
6. **Setiap perubahan id topik wajib disertai map migrasi** (`topic-map.json`) + bump
   `contentVersion` (guest) dan flag profil (cloud).
7. **`create_file` menolak file yang sudah ada** → `rm -f` dulu sebelum menulis ulang.

---

## 7. Status migrasi data (penting)

Urutan migrasi yang sudah berjalan, dijalankan otomatis oleh
`src/components/providers/store-provider.tsx`:

1. `migrateGuestData` — snapshot tamu lama → format sekarang.
2. `migrateLegacyEngine` — FSRS → siklus, set `profile.engineV2 = true`.
3. `migrateTopicProgress` — per-level → per-topik:
   `topicMap[doc.id] ?? (coreMap[doc.id] ? topicMap[coreMap[doc.id]] : null)`,
   hapus progres/cycle usang, buat ulang cycle per topik dari `progress`,
   set `profile.topicsV3 = true` dan `profile.topicsV4 = true`.

Sudah terverifikasi pada akun pilot: `topicsV3 = true`, `topicsV4 = true`, 15 dokumen
`deckCycles` memakai id topik baru (mis. `de-a1-function-words-1`, `knownInCycle = 7`,
`pendingCardIds` berisi 2 id), dan dashboard produksi menampilkan A1 **16 topik** dengan
progres lama tetap terbawa (18/600).

Kalau nanti konten dibangun ulang dan **id topik berubah**, langkah wajibnya:

```bash
# 1. rebuild
npm run content:build && npm run seed:validate

# 2. buat topic-map.json baru: bandingkan file git HEAD (versi lama) vs file sekarang
#    (lihat riwayat commit 012acb6 — helper-nya membandingkan topic per id kartu)

# 3. bump versi + migrasi
#    - src/lib/store/local-store.ts        : contentVersion 4 -> 5
#    - src/lib/data/migrate-topics.ts      : ganti flag topicsV4 -> topicsV5
#    - src/types/index.ts                  : tambah field flag baru
#    - tests/unit/topics.test.ts           : sesuaikan rantai map

# 4. gate penuh + deploy + verifikasi Firestore
```

---

## 8. Pekerjaan yang tersisa (urutan prioritas)

1. **Bersihkan `proper-names.json`** — ada duplikat (`kroatien`, `havanna`, `herodеs`) dan satu
   entri memakai huruf Cyrillic (`е`) sehingga tidak pernah cocok. Setelah diperbaiki:
   rebuild → regenerasi `topic-map.json` → migrasi versi berikutnya.
2. **Perkecil "Kosakata umum" B1–C2** (903 / 1.088 / 1.297 / 932 kartu). Tambah
   `keywords`/`idKeywords`/`suffixes` di `scripts/content/topics.json`, lalu rebuild.
3. **Pulihkan volume C2** (1.688 dari target 2.200): naikkan `MAX_RANK` atau turunkan
   `MIN_SCORE` di `build-decks.py`.
4. **Kualitas kartu**: artikel/gender + contoh kalimat baru ada di 200 kartu A1 kurasi
   (`src/content/de/source/curated-a1.json`).
5. **Akun hanya menyimpan progres** — jangan tambah fitur yang dikunci di balik login.
6. **README** masih menyebut `topic-id-keywords.json` (file itu sudah dihapus/digabung ke
   `topics.json`) — rapikan saat menyentuh dokumentasi.
7. **Mandarin buku 5–6**: file sumber berhenti di Buku 5 L10 dan Buku 6 belum ada. Minta
   ekspor tambahan, lalu jalankan `npm run content:zh -- --books 5,6`, tambahkan loader
   `zh:book5`/`zh:book6` di registry, dan lengkapi `en-id-*.tsv` untuk gloss baru.

---

## 9. Gotchas (yang sudah pernah menggigit)

- **Font**: stack tipografi dideklarasikan di `body`, bukan `:root`. `next/font`
  menaruh variabelnya di `<body>`; kalau `--font-display` dideklarasikan di `:root`
  dengan `var(--font-fraunces)` yang belum ada, nilainya invalid-by-inheritance dan
  seluruh UI diam-diam jatuh ke sans sistem. Hanzi tetap `font-cjk`, tidak pernah
  `display`.
- **Font CJK**: Noto Sans TC di-self-host lewat `next/font` (`--font-cjk-face`),
  dipecah ratusan potongan `unicode-range` (~5 MB total di `.next/static/media`),
  tapi browser hanya mengunduh potongan yang dipakai. Stack `sans`/`display`/`mono`
  semuanya jatuh ke `var(--font-cjk-face)` supaya hanzi tidak pernah dirender
  Inter/Source Serif 4 atau font sistem (yang di sebagian mesin berupa serif Jepang).
- **Label konten**: manifest menyimpan satu judul (`Buku 1`, `Bab 3`, `Sapaan &
  perkenalan`). Jangan render `deck.name` / `section.label` langsung — pakai
  `sectionLabelFor` / `unitLabelFor` dari `src/lib/content/labels.ts`, kalau tidak
  mode `en` akan menampilkan bahasa Indonesia.
- **Deep link lintas course**: `/levels/A1` saat course aktif `zh` (atau sebaliknya)
  harus mengganti `activeCourseId` dulu, kalau tidak daftar unit kosong. Lihat efek
  sinkronisasi di `levels/[level]/page.tsx`.

- **Next 16**: middleware bernama `src/proxy.ts` (bukan `middleware.ts`). `partialPrefetching`
  butuh `cacheComponents`; repo ini memakai `cacheComponents: false`.
- **next-intl**: root layout ada di `app/[locale]/layout.tsx`; guard `generateMetadata` dengan
  `hasLocale`. Key di `messages/*.json` memakai indentasi 8 spasi (formatter repo).
- **Formatter repo mengubah indentasi JSON** — pernah muncul diff besar yang ternyata
  *formatting only* di `scripts/content/topics.json` & `proper-names.json`. Cek dengan
  membandingkan `json.dumps(sort_keys=True)` sebelum panik.
- **`create_file` menolak file existing** → hapus dulu.
- **Polling status deploy lewat GitHub API bisa kena rate limit** → verifikasi dengan
  mengambil halaman produksi (angka topik di `/id/dashboard`) bukan API.
- **Tanpa secret**: tidak ada route server yang butuh API key; jangan tambah `firebase-admin`.
- **Login Google**: domain produksi harus terdaftar di Firebase Console →
  Authentication → Settings → **Authorized domains**. Kalau belum, SDK menolak dengan
  `auth/unauthorized-domain` (UI sekarang menampilkan pesan khusus + kode error itu).
  Email/password tidak terpengaruh.
- **Kartu pending** dulu hilang saat pindah halaman — sudah diperbaiki di `de33029`;
  jangan kembalikan perilaku lama saat refactor `buildSession`.
- **`window`/`localStorage`** hanya di komponen client; store provider sudah menangani guard.
- **Test konten** bergantung pada `topic-map.json`; kalau map belum dibuat ulang, test migrasi
  akan gagal (bukan bug kode).

---

## 10. Cara verifikasi manual (5 menit)

```bash
# lokal
npm run build && npm run start -- -p 3100
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3100/id/login        # 200
pkill -f next-server
```

Di browser (produksi atau lokal):

1. `/id/dashboard` → 6 band, A1 menampilkan **16 topik**.
2. `/id/levels/A1` → daftar topik berurutan; ada 🔗 "Kata fungsi & penghubung (1/2)" dan (2/2).
3. Buka satu topik → jawab beberapa kartu **Ulangi**, lalu **Sudah paham**, keluar, buka lagi →
   kartu pending masih muncul.
4. Habiskan topik → header berubah `Putaran 2`, hitungan paham kembali 0.
5. `/id/stats` → streak & heatmap bertambah setelah sesi.
6. Login Google → progres tamu ikut (bila akun masih kosong).

---

## 11. Konteks siap-tempel untuk AI baru

> Repo `/home/cislab301b/Aditya/try web` = GoAbroad, Next.js 16 + Firebase + Vercel.
> Sudah live di https://goabroad-rho.vercel.app (commit `012acb6`). Produk: flashcard Jerman
> A1–C2, 9.688 kartu / 177 topik, sesi = 1 topik penuh dengan tombol Ulangi/Sudah paham dan
> siklus auto-reset. Mode tamu (localStorage `goabroad.guest.v2`, `contentVersion 4`) dan mode
> akun (Firestore `progress` + `deckCycles`). Migrasi otomatis: `engineV2`, `topicsV3`,
> `topicsV4` via `migration-map.json` lalu `topic-map.json`.
> Aturan: pakai Node di `.node/` (`source ./activate.sh`), dev hanya `127.0.0.1`, matikan server
> dengan `pkill -f next-server`, jangan renumber ID kartu/topik, jangan salin konten ke Firestore,
> jangan pakai `firebase-admin`. Gate: `typecheck`, `lint`, `test`, `seed:validate`, `build`.
> Baca `docs/PRD.md` untuk kebutuhan produk dan file ini untuk status teknis.
