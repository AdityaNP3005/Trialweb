# PRD — GoAbroad

> **Produk:** GoAbroad — flashcard bahasa asing, rilis pertama **Bahasa Jerman A1–C2**
> **Repo:** `AdityaNP3005/Trialweb` (folder kerja `try web`) · **Produksi:** https://goabroad-rho.vercel.app
> **Dokumen versi:** 2.0 · **Terakhir diperbarui:** 2026-10-21 · **Commit acuan:** `012acb6`
> **Dokumen pendamping:** [`BRIEFING.md`](./BRIEFING.md) (status teknis & onboarding AI/kontributor)

---

## 1. Ringkasan

GoAbroad adalah web app hafalan kosakata berbasis flashcard. Pengguna memilih **band CEFR**
(A1–C2) untuk Jerman atau **buku** untuk Mandarin, lalu memilih **satu topik/bab**
(mis. "Sapaan & perkenalan", "Bab 3"). Satu sesi menyelesaikan satu unit penuh; setiap kartu
dijawab **Ulangi** atau **Sudah paham**.
Topik dianggap tuntas ketika semua kartunya sudah ditampilkan tanpa sisa kartu "Ulangi",
lalu siklus topik otomatis direset (`Putaran 2`, `Putaran 3`, …).

Fitur belajar **gratis tanpa akun** (mode tamu, data di browser). Akun hanya diperlukan untuk
**sinkronisasi cloud** dan **fitur AI**.

---

## 2. Masalah & peluang

| Masalah pengguna | Dampak | Jawaban produk |
| --- | --- | --- |
| Aplikasi flashcard populer memaksa login sebelum bisa belajar | Friksi, data pribadi, tidak bisa dicoba cepat | Mode tamu penuh fungsi, login opsional |
| Kosakata disajikan acak tanpa konteks tema | Sulit membangun pola, terasa tidak terarah | Deck dipecah per topik, urutan topik per band |
| Batas "kartu harian" memotong di tengah topik | Topik tidak pernah tuntas, progres kabur | Sesi = 1 topik utuh, tanpa jatah harian |
| Progres tidak terlihat per tema | Pengguna tidak tahu harus lanjut ke mana | Progres per topik, per band, dan statistik harian |
| Deck A1–C2 berbayar / tersebar tidak konsisten | Biaya, kualitas tidak merata | 9.688 kartu terkurasi dari data terbuka, gratis |

Peluang: mahasiswa/pekerja yang butuh kosakata Jerman untuk studi (Ausbildung, Studienkolleg,
Goethe/ÖSD) dan ingin alat ringan yang bisa dibuka di browser tanpa instalasi.

---

## 3. Tujuan & non-tujuan

**Tujuan (MVP, sudah tercapai)**
1. Belajar Jerman A1–C2 tanpa akun, dengan progres per topik yang tidak hilang.
2. Model hafalan "ulangi sampai paham" per topik, bukan jatah kartu harian.
3. Konten tidak redundan lintas band dan tidak berisi nama diri (negara/kota/nama orang).
4. Sinkron cloud untuk pengguna yang login, dengan migrasi otomatis dari data lama.
5. Deploy publik tanpa membuka port di server lab (Vercel + Firebase terkelola).

**Non-tujuan (sekarang)**
- Sertifikasi resmi atau klaim kesetaraan level dengan daftar Goethe/ÖSD (data level = perkiraan
  berbasis frekuensi).
- Aplikasi native Android/iOS.
- Multi-bahasa target selain Jerman (arsitektur disiapkan, konten belum ada).
- Fitur sosial (leaderboard, kelas, guru) dan pembayaran.
- Panel admin berbasis web untuk mengelola konten.

---

## 4. Prinsip produk

1. **Gratis tanpa akun.** Semua fitur belajar inti berjalan di mode tamu.
2. **Akun = sinkron + AI.** Login tidak pernah menjadi syarat untuk belajar.
3. **Satu sesi, satu topik.** Band tidak pernah dicampur dalam satu sesi.
4. **Urutan topik berbeda per band**, dimulai dari tema paling umum.
5. **"Paham" adalah keputusan pengguna**, bukan hasil algoritma. Pengulangan hanya menjadwalkan
   kartu muncul kembali.
6. **Server lab aman**: dev/start hanya loopback, produksi hanya lewat Vercel.
7. **ID stabil**: ID kartu/topik tidak pernah di-*renumber*, karena progres pengguna merujuk ke ID.

---

## 5. Pengguna & journey

**Persona utama** — "Rani", mahasiswa yang menyiapkan studi di Jerman. Belajar 10–20 menit
di sela kuliah, sering dari HP, malas membuat akun baru.

**Journey**
1. Buka `/id` → landing → **Coba tanpa akun**.
2. Dashboard: 6 kartu band (A1–C2) dengan persen progres, jumlah topik, dan "Lanjutkan: …".
3. Pilih **A1** → `/levels/A1` → daftar topik berurutan + status (BARU / BERJALAN / SELESAI).
4. Buka "Sapaan & perkenalan" → sesi: depan kartu (Jerman) → `Space` → arti Indonesia.
5. Tekan **Ulangi** (kartu kembali ±3 kartu kemudian) atau **Sudah paham**.
6. Sesi tuntas → siklus reset, `Putaran 2`, progres topik 0/37 lagi; progres band naik.
7. (Opsional) Login Google → progres tamu diunggah ke akun, bisa dilanjutkan di perangkat lain.

---

## 6. Lingkup fitur & status

Legenda: ✅ rilis & terverifikasi di produksi · 🟡 ada tapi terbatas · ⛔ belum ada

| ID | Fitur | Status | Keterangan / implementasi |
| --- | --- | --- | --- |
| F-01 | Landing + i18n `id`/`en` | ✅ | `next-intl`, `src/proxy.ts`, `messages/{id,en}.json` |
| F-02 | Mode tamu (tanpa akun, tanpa Firebase) | ✅ | `src/lib/store/local-store.ts`, localStorage `goabroad.guest.v2` |
| F-03 | Auth email/password + Google | ✅ | Firebase Auth; reset password; guard `/login` |
| F-04 | Dashboard pilih band | ✅ | 6 kartu: persen, `x/y` kartu, `n/topik selesai`, "Lanjutkan" |
| F-05 | Daftar topik per band | ✅ | `/levels/[level]`, urutan dari `topics.json.orders` |
| F-06 | Sesi topik: Ulangi / Sudah paham | ✅ | `src/lib/study/session.ts`, shortcut `1/R`, `2/N`, `Space` |
| F-07 | Siklus topik + reset otomatis | ✅ | `deckCycles`: `cursor`, `cycle`, `knownInCycle`, `pendingCardIds` |
| F-08 | Progres per topik & per band | ✅ | `summarizeBand()` di `src/content/courses.ts` |
| F-09 | Statistik harian, streak, kuis | ✅ | `dailyStats`, `src/lib/quiz`, `/stats` |
| F-10 | Text-to-speech Jerman | ✅ | Web Speech API (`de-DE`) via `src/hooks/use-speech.ts` |
| F-11 | Deck kustom + impor CSV | ✅ | `/decks`, `/decks/[deckId]`, `papaparse` + validasi `zod` |
| F-12 | Generate kartu dengan AI | 🟡 | `/api/ai/generate` (gate token + `GEMINI_API_KEY`), dialog di halaman deck kustom; butuh akun |
| F-13 | Ekspor JSON (backup) | ✅ | `/settings` |
| F-14 | Migrasi otomatis data lama | ✅ | FSRS→siklus (`engineV2`), per-level→per-topik (`topicsV3`, `topicsV4`) |
| F-15 | Validator konten + unit test | ✅ | `npm run seed:validate`, 34 test Vitest |
| F-16 | Offline/PWA | ⛔ | Firestore punya cache persisten; tamu tetap jalan tanpa jaringan setelah load |
| F-17 | Bahasa target kedua | ⛔ | Registry & `courseId` siap, konten belum |

---

## 7. Spesifikasi alur belajar

### 7.1 Aturan sesi

| Aturan | Nilai |
| --- | --- |
| Unit sesi | 1 topik (bukan campuran topik/band) |
| Jumlah kartu per sesi | seluruh kartu topik, maksimum 80 (topik besar dipecah `(1/2)`) |
| Tombol jawaban | `Ulangi` (kartu diulang), `Sudah paham` (selesai untuk putaran ini) |
| Jarak kemunculan ulang | ±3 kartu setelah jawaban "Ulangi" |
| Batas ulang per kartu | 5 kali per sesi (`MAX_REPEATS_PER_CARD`) |
| Kartu "pending" | tetap ada sampai dijawab "Sudah paham" (tidak hilang saat pindah halaman) |
| Reset siklus | otomatis saat `cursor` habis dan tidak ada pending → `cycle + 1`, `knownInCycle = 0` |
| Reset manual | tombol "Mulai ulang topik" di `/levels/[level]` |
| Urutan kartu | urutan file konten, atau acak bila `profile.prefs.shuffleCards` aktif |

### 7.2 State machine (ringkas)

```
PILIH BAND ──▶ PILIH TOPIK ──▶ SESI (kartu 1..N)
                                   │
              "Ulangi" ────────────┤ selipkan kartu +3 posisi, pending +1
              "Sudah paham" ───────┤ knownInCycle +1
                                   ▼
                    cursor habis & pending = 0 ?
                       ya ──▶ cycle + 1, knownInCycle = 0 ──▶ SESI (putaran baru)
                       tidak ──▶ tampilkan pending berikutnya
```

### 7.3 Ketentuan progres

- Progres topik = `knownInCycle / cardCount` untuk putaran berjalan; topik dianggap **SELESAI**
  bila pernah `cycle > 1` (minimal satu putaran penuh) dan tidak ada pending.
- Progres band = jumlah kartu `known` di semua topik ÷ total kartu band.
- Statistik harian mencatat `reviews`, `next`, `repeat`, `known`, `studyMs`, `quizCorrect`,
  `quizTotal` (dipakai streak & heatmap; legacy field opsional).

---

## 8. Spesifikasi konten

### 8.1 Volume saat ini (`012acb6`)

| Band | Topik | Kartu | Catatan |
| --- | --- | --- | --- |
| A1 | 16 | 600 | 200 kartu pertama kurasi manual (punya artikel + contoh kalimat) |
| A2 | 27 | 1.200 | |
| B1 | 32 | 1.800 | |
| B2 | 33 | 2.000 | |
| C1 | 40 | 2.400 | |
| C2 | 29 | 1.688 | kandidat habis setelah filter nama diri (target awal 2.200) |
| **Total** | **177** | **9.688** | |

### 8.2 Pipeline

```
FrequencyWords de_50k.txt ─┐
Wikdict de-id.sqlite3 ─────┼─▶ scripts/content/build-decks.py ─▶ src/content/de/{a1..c2}.json
Wikdict de-en.sqlite3 ─────┘        ├─ manifest.json (v2: level → topik → jumlah kartu)
                                    ├─ migration-map.json (id core lama → id topik v3)
                                    └─ topic-map.json     (id topik v3 → id topik v4)
```

Aturan klasifikasi (`scripts/content/topics.json`):
1. kata kunci pada lemma Jerman → 2. kata kunci pada arti Indonesia (`idKeywords` regex) →
3. aturan sufiks (`-ung`, `-heit`, `-keit`, `-schaft`, `-tion`, `-platz`, `-zeug`, `-krankheit`, …) →
4. `fallbackWordTypes` per topik → 5. topik `general` ("Kosakata umum").

Batasan teknis: `MIN_SCORE = 0.5`, `MAX_RANK = 50_000`, `MAX_TOPIC_SIZE = 80`,
`MIN_TOPIC_SIZE = 8`, dedupe lintas band memakai `wordType:lemma` (satu lemma hanya di
band terendah), ukuran target per band `LEVEL_SIZES = 600/1200/1800/2000/2400/2200`.

**Filter nama diri** (`scripts/content/proper-names.json` + aturan "arti == lemma"):
negara, benua, kota besar, dan nama orang umum dibuang. Nama bahasa/demonim
(`Deutsch`, `Amerikaner`) **sengaja dipertahankan** karena bagian dari pelajaran.
Kata kasar/makian **tidak** difilter — tetap kosakata yang sah untuk dipelajari.

### 8.3 Kualitas yang masih kurang

- Gender/artikel kata benda dan contoh kalimat baru ada di 200 kartu A1 kurasi.
- Tumpukan "Kosakata umum" masih besar di B1–C2 (903 / 1.088 / 1.297 / 932 kartu) — prioritas
  perbaikan klasifikasi berikutnya, dengan menambah kata kunci/sufiks di `topics.json`.
- `proper-names.json` masih punya duplikat (`kroatien`, `havanna`, `herodеs`) dan satu entri
  dengan huruf Cyrillic; perlu dibersihkan saat rebuild berikutnya.

---

### 8.4 Mandarin tradisional (buku 1–4)

Course `zh` memakai acuan *當代中文課程* dengan struktur **Buku → Bab** (tanpa subbab).
Satu bab = `LNN-I` + `LNN-II` pada daftar kosakata, dan menjadi satu sesi.

| Buku | Bab | Kartu |
| --- | --- | --- |
| Buku 1 | 15 | 520 |
| Buku 2 | 15 | 618 |
| Buku 3 | 12 | 804 |
| Buku 4 | 12 | 949 |
| **Total** | **54** | **2.891** |

- **Kartu**: depan Hanzi (font CJK), belakang **pinyin** (tanda nada) + arti **Inggris** + **Indonesia**.
- **Audio**: Web Speech API `zh-TW` (sama seperti Jerman memakai `de-DE`). Tidak ada audio buku
  yang di-host karena berhak cipta; suara berasal dari perangkat pengguna.
- **Klasifikasi**: buku & bab hanya untuk pengurutan. Nama orang (tokoh dialog/tokoh sejarah)
  dibuang, nama tempat/negara dipertahankan karena diajarkan di bab.
- **Dedupe**: kunci `hanzi|pinyin`, kemunculan pertama menang; bab tetap unik.
- **Kelengkapan**: setiap baris sumber harus menjadi kartu atau tercatat di
  `src/content/zh/report.json` (duplikat/nama dibuang), dan validator menolak kartu tanpa
  arti Indonesia.
- **Cakupan saat ini**: Buku 5 baru memuat L01–L10 pada file sumber dan Buku 6 belum ada,
  sehingga keduanya belum dirilis.

## 9. Model data

### Cloud (Firestore, per akun)

```
users/{uid}                         profile: displayName, prefs{shuffleCards}, tts, flags migrasi
users/{uid}/progress/{cardId}       {deckId, level, known, repeats, cycle, updatedAt} (+counter harian)
users/{uid}/deckCycles/{deckId}     {cursor, cycle, knownInCycle, pendingCardIds[], updatedAt}
users/{uid}/dailyStats/{YYYY-MM-DD} {reviews, next, repeat, known, studyMs, quizCorrect, quizTotal}
users/{uid}/reviews/{id}            log jawaban (audit)
users/{uid}/decks/{deckId}          deck buatan sendiri
users/{uid}/cards/{cardId}          kartu deck kustom / impor / AI
```

Index komposit: `cards(deckId, createdAt)`, `progress(deckId)`, `reviews(deckId, createdAt)`.

### Tamu (localStorage `goabroad.guest.v2`)

`{contentVersion, profile, progress, cycles, dailyStats, reviews}` — struktur sama dengan cloud.
`contentVersion = 4`; saat dibuka, id topik lama di-remap lewat `topic-map.json` lalu
`migration-map.json`, dan siklus dibangun ulang dari `progress`.

Keputusan penting: **kartu tidak disalin per akun** (kecuali deck kustom). Menambah band/topik
tidak menambah biaya tulis per pengguna.

---

## 10. Arsitektur & keputusan teknis

| # | Keputusan | Alasan |
| --- | --- | --- |
| A1 | Next.js 16 App Router + React 19 + TS strict | SSR ringan, deploy Vercel tanpa server sendiri |
| A2 | Konten dibundel statis (`src/content/de/*.json`) + loader statis | Baca cepat, biaya Firestore nol, bisa jalan tanpa akun |
| A3 | Engine siklus sendiri (bukan FSRS) | Sesuai permintaan: jatah kartu harian diganti siklus per topik |
| A4 | Guest-first, cloud opsional | Prinsip gratis tanpa akun |
| A5 | Verifikasi token AI via JWKS `jose` (tanpa `firebase-admin`) | Tidak perlu service account/kredensial server |
| A6 | Firebase Auth + Firestore cache persisten | Sinkron + tetap responsif di jaringan lambat |
| A7 | Dev/start bind `127.0.0.1` | Server lab, port tidak boleh terbuka ke jaringan |
| A8 | Migrasi data bertahap dengan flag (`engineV2`, `topicsV3`, `topicsV4`) | Perubahan model tidak menghapus progres pengguna |
| A9 | ID kartu/topik stabil, hanya append | Progres merujuk ke ID |
| A10 | i18n `id` (default) + `en` | Pengguna utama Indonesia |

---

## 11. Kebutuhan non-fungsional

- **Keamanan**: `firestore.rules` membatasi akses ke `users/{uid}` milik sendiri; API AI wajib
  token Firebase + rate limit 20/user/hari (in-memory); secret hanya di env server.
- **Privasi**: mode tamu tidak mengirim data ke mana pun; tidak ada analytics pihak ketiga.
- **Performa**: dashboard & daftar topik < 1,5 s pada koneksi 4G; konten dimuat per level
  (file terbesar C1 ~2.400 kartu).
- **Biaya**: Firestore hanya menyimpan progres (≈1 dokumen per kartu yang disentuh),
  target < 100 rb read/hari pada puluhan pengguna aktif.
- **Aksesibilitas**: navigasi keyboard penuh pada sesi (Space/1/2/Q), target sentuh ≥ 44 px.
- **Kompatibilitas**: Chrome/Edge/Firefox/Safari terbaru; TTS bergantung browser.

---

## 12. Metrik keberhasilan

| Metrik | Target awal |
| --- | --- |
| Penyelesaian topik pertama (guest) | ≥ 50% pengunjung yang membuka topik |
| Topik tuntas per pengguna aktif/minggu | ≥ 3 topik |
| Konversi tamu → akun | ≥ 10% |
| Rasio kartu "Ulangi" turun antar putaran | turun ≥ 30% dari putaran 1 ke 2 |
| Error rate API AI | < 2% (di luar 401/503 yang disengaja) |

---

## 13. Acceptance criteria

**Dashboard & navigasi band**
- [x] `/id/dashboard` menampilkan 6 band; tiap kartu memuat persen, `x/y` kartu, jumlah topik.
- [x] Tidak ada tombol "Mulai sesi" global; entry point = pilih band → pilih topik.
- [x] "Lanjutkan: …" menunjuk topik pertama yang belum selesai sesuai urutan band.

**Sesi topik**
- [x] Sesi hanya memuat kartu dari satu topik (`card.topic === topic.key`).
- [x] `Ulangi` menyelipkan kartu kembali ±3 posisi dan menaikkan badge ulang.
- [x] Kartu pending tidak hilang saat halaman ditinggal lalu dibuka lagi.
- [x] Setelah semua kartu tampil tanpa pending, header berubah `Putaran 2` dan hitungan 0/N.
- [x] Shortcut keyboard `Space`, `1`/`R`, `2`/`N` berfungsi.

**Progres & data**
- [x] Guest: progres bertahan setelah reload/tutup browser (localStorage).
- [x] Cloud: progres tersimpan di `progress/{cardId}` + `deckCycles/{deckId}` dan sinkron di
      perangkat lain.
- [x] Migrasi `topicsV4` memindahkan progres lama ke ID topik baru tanpa kehilangan status
      "paham" (kartu lama masuk sebagai pending topik baru).
- [x] Tidak ada dokumen progres/cycle dengan ID topik usang setelah migrasi.

**Konten**
- [x] `npm run seed:validate` lolos: jumlah kartu per topik = manifest, ID topik unik, urutan unik,
      tidak ada duplikat `wordType:lemma` lintas band.
- [x] Tidak ada nama negara/kota/nama orang pada kartu kosakata.
- [x] 9.688 kartu dalam 177 topik; setiap topik ≤ 80 kartu.

**AI & akun**
- [x] `/api/ai/generate` tanpa token → 401; tanpa `GEMINI_API_KEY` → 503.
- [x] Login Google/email berfungsi di domain produksi (authorized domain terdaftar).

**Operasional**
- [x] `npm run typecheck`, `lint`, `test` (34), `seed:validate`, `build` hijau.
- [x] `ss -ltnp` tidak menampilkan port dev setelah sesi selesai (tidak ada port terbuka di lab).
- [x] Deploy Vercel otomatis dari `main`; dashboard produksi menampilkan angka konten terbaru.

---

## 14. Rilis & operasional

1. Gate wajib: `npm run typecheck && npm run lint && npm test && npm run seed:validate && npm run build`.
2. Push ke `main` → Vercel build otomatis (project `goabroad`).
3. Verifikasi produksi manual: `/id/dashboard` (angka band), `/id/levels/A1` (daftar topik),
   `/id/study/de-a1-greetings` (sesi jalan), `/api/ai/generate` tanpa token → 401/503.
4. Smoke lokal: `npm run start -- -p 3100`, lalu `pkill -f next-server` dan cek `ss -ltnp`.

---

## 15. Roadmap

**P0 — sisa pekerjaan dekat**
- [ ] Bersihkan duplikat & entri Cyrillic di `proper-names.json`, rebuild, regenerasi
      `topic-map.json`, rangkai migrasi `topicsV5` bila ID berubah.
- [ ] Perkecil tumpukan "Kosakata umum" B1–C2 (target < 400 kartu/band).
- [ ] Pulihkan volume C2 menuju 2.200 kartu (naikkan `MAX_RANK`/turunkan `MIN_SCORE`).

**P1 — kualitas belajar**
- [ ] Gender/artikel + contoh kalimat untuk kartu hasil pipeline (butuh sumber data tambahan).
- [ ] Uji coba "Ulangi" terjadwal ringan (mis. 3 putaran minimal sebelum topik dianggap SELESAI).
- [ ] Rate limit AI dipindah ke Firestore (aman untuk multi-instance Vercel).
- [ ] Import/ekspor progres cloud (JSON) untuk pindah akun.

**P2 — ekspansi**
- [ ] Bahasa target kedua (Inggris → Prancis/Spanyol) memakai pipeline & topik serupa.
- [ ] PWA/offline penuh untuk mode tamu.
- [ ] Panel admin konten (review kartu, koreksi arti) tanpa mengubah file JSON manual.

---

## 16. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| ID topik berubah saat rebuild konten | Progres pengguna hilang | `topic-map.json` + migrasi bertahap + test khusus |
| Klasifikasi topik kurang tepat | Topik terasa tidak relevan | Aturan berlapis (kata kunci → arti → sufiks), `seed:validate`, review manual sampel |
| Level A2–C2 hanya perkiraan frekuensi | Ekspektasi salah | Dinyatakan jelas di README & PRD |
| Kuota Firestore gratis habis | Sinkron gagal | Konten tidak disalin per akun; read dibatasi; cache lokal |
| Port dev terbuka di server lab | Risiko keamanan | Bind `127.0.0.1`, `dev:network` opt-in, verifikasi `ss -ltnp` |
| Data Wikdict/FrequencyWords berubah lisensi/format | Pipeline macet | Cache `.content-cache/`, atribusi CC BY-SA 4.0 di `NOTICE.md` |

---

## 17. Glosarium

- **Band** — tingkat CEFR (A1–C2).
- **Topik** — kelompok kartu bertema, unit sesi (contoh: "Sapaan & perkenalan").
- **Putaran / siklus** — satu kali semua kartu topik ditampilkan tanpa pending.
- **Pending** — kartu yang dijawab "Ulangi" dan belum dijawab "Sudah paham".
- **Paham (`known`)** — kartu yang dijawab "Sudah paham" pada putaran berjalan.
- **Tamu (guest)** — pengguna tanpa akun, data di localStorage.
- **`topicsV4`** — flag di profil yang menandai migrasi topik generasi terbaru sudah dijalankan.
