# Menulis bahasa Jerman: latihan ejaan & Schreiben ala Goethe

Halaman **Menulis** (`/writing`) saat bahasa aktif Deutsch berisi dua tab.

## 1. Latihan ejaan

Arti kata ditampilkan dalam bahasa UI (Indonesia → `meaningId`, Inggris → `meaningEn`),
lalu pengguna mengetik kata Jermannya. Satu ronde berisi 10 kata acak.

- **Sumber kata (default): progres flashcard.** Yang dipakai adalah kartu Jerman yang
  pernah ditandai "Sudah paham" (`knownCount > 0`), lewat `store.listKnownCardIds("de")`.
  Untuk tamu datanya dari `localStorage`. Untuk akun, kueri Firestore `progress` dengan
  `courseId == "de"`, lalu disaring di aplikasi supaya tidak butuh indeks komposit baru.
- **Opsi: acak dari band** (A1–C2, default A1). Kata diambil dari semua topik band itu.
- **Kata benda harus ditulis dengan artikelnya** (*der Tisch*). Pola dengan "…" dilewati.
- **Penilaian** (`src/lib/writing/spelling.ts`, diuji di `tests/unit/spelling.test.ts`):

| Hasil | Kapan | Poin |
| --- | --- | --- |
| Benar | sama persis (artikel boleh diawali huruf besar: *Der Tisch*) | 1 |
| Hampir | huruf besar/kecil salah · ae/oe/ue/ss sebagai ganti umlaut/ß · artikel tidak ada atau salah · salah ketik ≤ 1 huruf (≤ 2 untuk kata > 8 huruf) | 0,5 |
| Salah | selain itu | 0 |

- Setelah setiap jawaban muncul jawaban yang benar, audio, dan cara baca (`readingId`).
  Di akhir ronde ada ringkasan skor dan tombol "Ulangi yang belum benar".
- Tombol ä ö ü ß Ä Ö Ü disediakan untuk keyboard yang tidak punya huruf itu.

## 2. Schreiben (format Goethe-Zertifikat)

Ada 12 set soal (2 per band) di `src/content/de/schreiben.json`. **Semua soal ditulis
untuk aplikasi ini** dengan format, jumlah kata, dan jumlah poin isi yang sama dengan
ujian resmi. Soal Modellsatz Goethe tidak disalin karena berhak cipta. Setiap tugas teks
punya contoh jawaban, dan test memastikan setiap contoh jawaban lolos pemeriksaan otomatis
aplikasi.

### Format per band (dari Modellsatz/Übungssatz resmi)

| Band | Bagian | Jenis teks | Panjang |
| --- | --- | --- | --- |
| A1 (Start Deutsch 1) | Teil 1 | mengisi formulir dari teks (5 isian) | — |
| | Teil 2 | pesan singkat ke instansi, 3 poin isi | ±30 kata |
| A2 | Teil 1 | SMS ke teman, 3 poin | 20–30 kata |
| | Teil 2 | surel (formal), 3 poin | 30–40 kata |
| B1 | Aufgabe 1 | surel ke teman, 3 poin | ±80 kata |
| | Aufgabe 2 | pendapat di forum/buku tamu | ±80 kata |
| | Aufgabe 3 | surel formal singkat | ±40 kata |
| B2 | Teil 1 | tulisan forum, 4 poin | ±150 kata |
| | Teil 2 | pesan formal (kerja/pendidikan), 4 poin | ±100 kata |
| C1 | Teil 1 | tulisan diskusi forum, 4 poin | ±230 kata |
| | Teil 2 | surat formal (keluhan/permintaan), 4 poin | ±120 kata |
| C2 (GDS) | Teil 1 | parafrase 10 kalimat dengan kata wajib | — |
| | Teil 2 | surel/surat pembaca menanggapi 3 pernyataan | ±350 kata |

### Teknik penilaian

Bobot dan kriteria diambil dari lembar penilaian resmi (`src/lib/writing/schreiben.ts`,
diuji di `tests/unit/schreiben.test.ts`):

| Band | Bagian | Kriteria → poin (A / B / C / D / E) | Maks |
| --- | --- | --- | --- |
| A1 | Teil 1 | per isian 1 / 0 | 5 |
| A1 | Teil 2 | tiap poin isi 3 / 1,5 / 0 + Kommunikative Gestaltung 1 / 0,5 / 0 | 10 |
| A2 | per Teil | Aufgabenerfüllung 5 / 3,5 / 2 / 0,5 / 0 + Sprache 5 / 3,5 / 2 / 0,5 / 0 | 10 |
| B1 | Aufgabe 1, 2 | Erfüllung, Kohärenz, Wortschatz, Strukturen masing-masing 10 / 7,5 / 5 / 2,5 / 0 | 40 |
| B1 | Aufgabe 3 | Erfüllung 4, Kohärenz 4, Wortschatz 6, Strukturen 6 | 20 |
| B2, C1 | Teil 1 | Erfüllung 14, Kohärenz 14, Wortschatz 16, Strukturen 16 | 60 |
| B2, C1 | Teil 2 | keempat kriteria masing-masing 10 | 40 |
| C2 | Teil 1 | per kalimat 2 / 1 / 0 | 20 |
| C2 | Teil 2 | Aufgabenerfüllung, Textaufbau, Kohärenz, Wortschatz, Strukturen masing-masing 4 / 3 / 2 / 1 / 0, × 4 | 80 |

Aturan resmi yang diterapkan:

- Jika Erfüllung bernilai E (0), seluruh bagian itu bernilai 0. Di C2, nilai 0 pada
  kriteria mana pun membuat bagian itu 0.
- Kurang dari 50% jumlah kata yang diminta membuat kriteria pemenuhan tugas otomatis E,
  sehingga bagian itu 0.
- Lulus jika mencapai 60% dari total poin.

Bagian yang **dicek otomatis**:

- Jumlah kata.
- Poin isi yang kemungkinan sudah dibahas, berdasarkan kata kunci per poin.
- Sapaan dan salam penutup untuk surat/pesan.
- Pemakaian *du* di teks formal.
- Ragam kata penghubung (*weil, deshalb, außerdem …*).
- Jawaban formulir A1, tanpa memedulikan huruf besar, spasi, dan ß/ss.
- Parafrase C2: sama dengan jawaban yang diterima → 2; memakai kata wajib tapi berbeda
  → 1, dan pengguna bisa mengubahnya; tanpa kata wajib → 0.

Dari pemeriksaan otomatis itu aplikasi **menyarankan** level Erfüllung (dari jumlah poin
isi yang terdeteksi dan register), level Kohärenz (dari jumlah penghubung), serta nilai
A1 per poin isi dan Gestaltung. **Wortschatz dan Strukturen dinilai sendiri oleh
pengguna**, berdasarkan deskriptor resmi dan setelah membandingkan dengan contoh jawaban,
karena kualitas bahasa tidak bisa dinilai andal tanpa penguji. Semua saran bisa diubah.
Kriteria yang belum dinilai ditandai dan dihitung 0 sampai dipilih.

Di ujian asli, dua penguji menilai secara terpisah. Skor di aplikasi adalah perkiraan
untuk latihan. Draf jawaban disimpan otomatis di `localStorage` browser
(`goabroad.schreiben.<setId>`), dan hasil penilaian tidak dikirim ke server.

### Sumber resmi

- A1 Start Deutsch 1 Modellsatz: https://www.goethe.de/pro/relaunch/prf/materialien/A1_sd1/sd_1_modellsatz.pdf
- A2 Modellsatz Erwachsene: https://www.goethe.de/pro/relaunch/prf/materialien/A2/A2_Modellsatz_Erwachsene.pdf
- B1 Übungssatz Erwachsene: https://www.goethe.de/pro/relaunch/prf/materialien/B1/B1_Uebungssatz_Erwachsene.pdf
- B2 Modellsatz Erwachsene: https://www.goethe.de/pro/relaunch/prf/materialien/B2/b2_modellsatz_erwachsene.pdf
- C1 Modellsatz: https://www.goethe.de/pro/relaunch/prf/materialien/C1_modular/c1-modular_modellsatz.pdf
- C2 GDS Übungssatz: https://www.goethe.de/pro/relaunch/prf/materialien/C2/c2-uebungssatz.pdf

## Batasan

- Deteksi poin isi berbasis kata kunci, jadi isi yang ditulis dengan kata lain bisa tidak
  terdeteksi. Karena itu hasilnya hanya saran.
- Tata bahasa dan ejaan dalam teks tidak dikoreksi otomatis.
- Hasil Schreiben tidak disimpan sebagai progres; hanya draf yang disimpan di browser.
