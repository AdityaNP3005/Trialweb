# BRIEFING — GoAbroad (untuk AI / kontributor berikutnya)

> Baca ini dulu sebelum menyentuh kode. Isinya **kondisi nyata repo saat ini**, bukan rencana.
> Dokumen kebutuhan lengkap ada di [`PRD.md`](./PRD.md).
> Commit acuan: **`012acb6`** (`main` = `origin/main`) · Produksi: https://goabroad-rho.vercel.app
> Terakhir diverifikasi: **2026-10-21**

---

## 0. Ringkasan 60 detik

Penataan topik terbaru: [`GERMAN-TOPICS-REVIEW.md`](./GERMAN-TOPICS-REVIEW.md).
9.483 kartu kini tersusun dalam 228 deck; `topicsV6` untuk akun, versi konten 6 untuk tamu.
Kategori akhir bersumber dari `de-topic-assignments.json`, bukan keyword/sufiks lama.
ID kartu tetap sama walaupun prefix-nya tidak lagi sama dengan deck pemiliknya.

Audit vocab terbaru: lihat [`GERMAN-VOCAB-REVIEW.md`](./GERMAN-VOCAB-REVIEW.md).
205 kartu duplikat digabung; ID kartu yang tersisa dipertahankan secara eksplisit.
Migrasi kurasi sebelumnya memakai `vocabV5`; penataan topik berikutnya memakai `topicsV6`.
Angka dan verifikasi produksi pada commit lama di bawah adalah catatan historis.

Web flashcard bahasa Jerman A1–C2. **Sudah live.** Pengguna memilih band → memilih topik →
satu sesi menyelesaikan seluruh kartu topik itu dengan tombol **Ulangi** / **Sudah paham**;
topik direset otomatis setelah semua kartu tampil (`Putaran 2`). Ada mode tamu (localStorage,
tanpa akun) dan mode akun (Firestore). Konten dibundel statis, **9.483 kartu / 228 topik**.
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
| Konten A1–C2 tanpa nama diri | ✅ | 9.483 kartu, 228 topik (audit vocab; lihat laporan) |
| Migrasi progres bertahap | ✅ | flag `engineV2`, `topicsV3`, `topicsV4` |
| Deck kustom + impor CSV | ✅ | `papaparse` + `zod`, `/decks` |
| Statistik, streak, heatmap, kuis | ✅ | `/stats`, `dailyStats` |
| **Mandarin tradisional (buku 1–4)** | ✅ | course `zh`, 54 bab, 2.891 kartu, TTS `zh-TW` |
| Artikel/gender, jamak, contoh kalimat Jerman | ✅ | 6.359/6.534 kata benda berartikel, 9.061 kartu bercontoh (3.180 dengan terjemahan ID), `scripts/content/de-enrich.py`, [`GERMAN-ENRICHMENT.md`](./GERMAN-ENRICHMENT.md) |
| Tombol audio pelan (60% kecepatan) | ✅ | `TtsButton slow`, di flashcard & kuis |
| Cara baca Jerman ejaan Indonesia (`readingId`) | ✅ | 9.483/9.483 kartu, IPA Wiktionary → huruf EYD V + pemenggalan, `scripts/content/de-pronunciation.py`, [`GERMAN-PRONUNCIATION.md`](./GERMAN-PRONUNCIATION.md) |

---

## 2. Angka konten setelah audit vocab 2026-10-21

| Band | Topik | Kartu |
| --- | --- | --- |
| A1 | 33 | 534 |
| A2 | 34 | 1.146 |
| B1 | 37 | 1.758 |
| B2 | 40 | 1.983 |
| C1 | 47 | 2.383 |
| C2 | 37 | 1.679 |
| **Total** | **228** | **9.483** |

Tidak ada kartu dalam bucket lama "Kosakata umum". Kata abstrak, tindakan umum,
dan sifat umum memiliki kategori tersendiri yang ditinjau per lemma.

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
| `src/app/[locale]/(app)/videos/[section]/page.tsx` | halaman materi video (client), fallback EmptyState bila belum ada playlist |
| `src/components/video/video-hub.tsx` | orkestrasi tontonan: pilih pelajaran, simpan progres, auto-play, reset |
| `src/components/video/youtube-player.tsx` | pembungkus YouTube IFrame API (singleton loader, ticker 1 s, fallback embed diblokir) |
| `src/components/video/video-lesson-row.tsx` | baris pelajaran: nomor, judul, stamp status, durasi |
| `src/lib/video/progress.ts` | fungsi murni: `applyWatch`, `resumePoint`, `playlistSummary`, `mergePlaylistProgress` |
| `src/lib/content/videos.ts` | loader manifest playlist statis |
| `src/content/de/videos/a1.json` | manifest playlist A1 (66 video) |
| `src/lib/data/videos.ts` | baca/tulis `users/{uid}/videoPlaylists/{playlistId}` |
| `src/lib/study/session.ts` | `buildSession`, `insertRepeat` (gap 3), `cycleProgress`, `MAX_REPEATS_PER_CARD` |
| `src/lib/data/progress.ts` | `submitAction`: progress + deckCycle + dailyStats + review log (batch) |
| `src/lib/data/migrate-topics.ts` | remap id topik cloud (`migration-map.json` → `topic-map.json`) |
| `src/lib/data/migrate-legacy.ts` | migrasi FSRS → siklus (`engineV2`) |
| `src/lib/store/local-store.ts` | mode tamu, `contentVersion = 6`, `remapTopics()` |
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
| `tests/unit/{session,topics,csv,quiz,streak,course-stats,video}.test.ts` | 68 test |

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

Khusus video, `migrateGuestVideos` dijalankan **sebelum** `migrateGuestData` (snapshot tamu
langsung dibersihkan langkah itu). Fungsinya menggabungkan `videos` tamu dengan cloud
(`seconds` terjauh, `completedAt` terawal), berjalan walau deck sudah ada, dan menandai
`profile.videosV1 = true`.

Sudah terverifikasi pada akun pilot: `topicsV3 = true`, `topicsV4 = true`, 15 dokumen
`deckCycles` memakai id topik baru (mis. `de-a1-function-words-1`, `knownInCycle = 7`,
`pendingCardIds` berisi 2 id), dan dashboard produksi menampilkan A1 **16 topik** dengan
progres lama tetap terbawa (18/600).

Untuk penataan berikutnya, simpan snapshot tata letak sebelum perubahan (seperti
`topic-map-v6.json`), pertahankan ID kartu, tambahkan versi migrasi baru serta bump
`contentVersion` tamu. Jangan menimpa `migration-map.json`, `topic-map.json`, atau
snapshot migrasi lama: akun yang lama tidak dibuka masih memerlukannya.

Kategori akhir diedit pada `scripts/content/de-topic-assignments.json` dan katalog
`de-topic-catalog.json`; `reclassify_decks.py` hanya menerapkan inventaris yang
sudah ditinjau. Gate penuh tetap wajib. Detail migrasi, penggabungan tamu, dan
cara audit ada di [laporan topik](GERMAN-TOPICS-REVIEW.md).

---

## 8. Pekerjaan yang tersisa (urutan prioritas)

1. **Bersihkan `proper-names.json`** — ada duplikat (`kroatien`, `havanna`, `herodеs`) dan satu
   entri memakai huruf Cyrillic (`е`) sehingga tidak pernah cocok. Setelah diperbaiki:
   rebuild → regenerasi `topic-map.json` → migrasi versi berikutnya.
2. **Kategori konten** sudah ditinjau per lemma; kata baru wajib ditambahkan ke
   `de-topic-assignments.json`. Lihat laporan topik untuk prosedur build dan migrasi.
3. **Pulihkan volume C2** (1.679 dari target 2.200): naikkan `MAX_RANK` atau turunkan
   `MIN_SCORE` di `build-decks.py`.
4. **Kualitas kartu**: artikel/gender + contoh kalimat baru ada di 200 kartu A1 kurasi
   (`src/content/de/source/curated-a1.json`).
5. **Akun hanya menyimpan progres** — jangan tambah fitur yang dikunci di balik login.
6. **Kurasi arti** berikutnya diterapkan melalui `de-gloss-overrides.json`; lihat audit vocab.
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
- **YouTube IFrame API**: butuh `enablejsapi=1` + `origin`; repo ini memakai host
  `youtube-nocookie.com`. Skrip `iframe_api` bisa diblokir pembaca feed/adblock sehingga
  `onReady` tidak pernah datang — loader punya timeout 12 detik lalu jatuh ke kartu error
  berisi tautan YouTube. Kode error pemutar: `2` id tidak valid, `5` tidak bisa diputar di
  HTML5, `100` video dihapus/privat, `101`/`150` embed dimatikan pemiliknya.
- **Progres video** menyimpan dua nilai: `seconds` (terjauh, monoton naik, dipakai untuk
  stamp selesai) dan `lastPositionSec` (posisi terakhir, boleh mundur). Jangan satukan —
  seek mundur akan menghapus capaian. Map Firestore ditulis dengan `set(..., {merge:true})`
  dan field bersarang, bukan dotted path.
- **Auto-play antar pelajaran** disimpan di `localStorage: goabroad.video.autoplay`; browser
  bisa memblokir play bersuara, jadi kegagalan `playVideo()` tidak boleh dianggap error fatal.

---

## 10. Cara verifikasi manual (5 menit)

```bash
# lokal
npm run build && npm run start -- -p 3100
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3100/id/login        # 200
pkill -f next-server
```

Di browser (produksi atau lokal):

1. `/id/dashboard` → 6 band, A1 menampilkan **33 topik**.
2. `/id/levels/A1` → daftar topik berurutan; judul Indonesia/Inggris sesuai bahasa UI.
3. Buka satu topik → jawab beberapa kartu **Ulangi**, lalu **Sudah paham**, keluar, buka lagi →
   kartu pending masih muncul.
4. Habiskan topik → header berubah `Putaran 2`, hitungan paham kembali 0.
5. `/id/stats` → streak & heatmap bertambah setelah sesi.
6. Login Google → progres tamu ikut (bila akun masih kosong).

---

## 11. Konteks siap-tempel untuk AI baru

> Repo `/home/cislab301b/Aditya/try web` = GoAbroad, Next.js 16 + Firebase + Vercel.
> Sudah live di https://goabroad-rho.vercel.app (commit `012acb6`). Produk: flashcard Jerman
> A1–C2, 9.483 kartu / 228 topik, sesi = 1 topik penuh dengan tombol Ulangi/Sudah paham dan
> siklus auto-reset. Mode tamu (localStorage `goabroad.guest.v2`, `contentVersion 6`) dan mode
> akun (Firestore `progress` + `deckCycles`). Migrasi otomatis: `engineV2`, `topicsV3`,
> `topicsV4` via `migration-map.json` lalu `topic-map.json`.
> Aturan: pakai Node di `.node/` (`source ./activate.sh`), dev hanya `127.0.0.1`, matikan server
> dengan `pkill -f next-server`, jangan renumber ID kartu/topik, jangan salin konten ke Firestore,
> jangan pakai `firebase-admin`. Gate: `typecheck`, `lint`, `test`, `seed:validate`, `build`.
> Baca `docs/PRD.md` untuk kebutuhan produk dan file ini untuk status teknis.
