# Mandarin: nada, kata satuan, karakter, contoh kalimat, dengar, menulis

Semua data tambahan dibuat oleh `scripts/content/zh/zh-enrich.py`. Hasilnya disimpan
per `front|pinyin` di `scripts/content/zh/zh-enrichment.json`, lalu diterapkan ke
`src/content/zh/book*.json`. `build-zh.py` menerapkannya ulang di akhir build.

| Fitur | Field | Sumber | Cakupan (buku 1–4) |
| --- | --- | --- | --- |
| Warna nada | `pinyinParts` | pinyin kartu dipecah per Hanzi; inventaris suku kata dari CC-CEDICT | 2.891 / 2.891 |
| Kata satuan (量詞) | `measureWords` | CC-CEDICT, bagian `CL:` dari entri yang pinyinnya sama dengan kartu | 353 kata benda |
| Rincian karakter | `characters` | arti Indonesia dari kartu karakter tunggal di kursus (jika ada), arti Inggris dari CC-CEDICT, radikal dari Make Me a Hanzi | 2.376 kata majemuk |
| Contoh kalimat | `exampleDe` (Hanzi), `examplePinyin`, `exampleId`, `exampleEn` | Tatoeba | 2.253 kartu (1.142 dengan terjemahan ID) |

## Warna nada

Mengikuti konvensi Pleco/MDBG: nada 1 merah, 2 oranye, 3 hijau, 4 biru, netral abu-abu.
Hanzi di depan kartu, pinyin, daftar kartu, rincian karakter, dan halaman menulis memakai
warna yang sama. Pemecahan pinyin (`segment_pinyin`) mencari tepat N suku kata untuk N
Hanzi. Spasi, tanda hubung, dan apostrof (*dà'ān*) dijadikan batas. Suku kata nasal
tunggal CC-CEDICT (*n, m, ng* dari 嗯/呣) dikeluarkan, karena akan memecah *cānguān*
secara salah.

## Contoh kalimat tradisional

Setiap kalimat Mandarin di Tatoeba punya satu transkripsi Han ke aksara *lainnya*.
Baris `Hans` berarti kalimat aslinya tradisional. Baris `Hant` berisi konversi otomatis
Tatoeba dari kalimat sederhana.

- Kalimat asli tradisional dipakai langsung (39.606 kalimat). Kalimat yang memuat
  karakter khusus aksara sederhana (们, 会, 对) dibuang.
- Kalimat sederhana dikonversi **per kata** dengan CC-CEDICT, memakai pinyin kata dari
  Tatoeba (头发 *tou2fa5* → 頭髮, bukan 頭發). Konversi ini hanya diterima jika **sama
  persis** dengan konversi otomatis Tatoeba (23.142 kalimat). Kata yang punya lebih
  dari satu bentuk tradisional membuat kalimat dibuang.
- Untuk kata 1–2 karakter, kalimat dicocokkan per **kata**, memakai segmentasi pinyin
  Tatoeba, jadi 手 tidak cocok dengan 手機. Kata 3+ karakter dan pola seperti 以...為
  dicocokkan per substring.
- Prioritas: ada terjemahan Indonesia (langsung atau lewat Inggris) > hanya Inggris,
  lalu kalimat yang belum dipakai kartu lain, lalu yang lebih pendek. Kalimat berhuruf
  Latin (*Facebook*, *Tom*) dilewati, dan tanda kutip pembungkus dibuang.

## Panduan pinyin

Di belakang kartu Mandarin ada panduan singkat yang bisa dibuka-tutup. Isinya huruf
pinyin yang menipu jika dibaca dengan ejaan Indonesia (x ≈ sy, q ≈ c + hembusan,
zh/ch/sh dengan lidah ditekuk, e ≈ ê, ü ≈ iu, -ong ≈ -ung). Pinyin **tidak** diubah ke
ejaan Indonesia, karena pinyin sendiri adalah sistem baca standar yang perlu dipelajari.

## Mode "Dengar"

Mode kuis ketiga di halaman sesi (berlaku untuk semua kursus; tombol Q berganti
kartu → kuis → dengar). Kata diputar otomatis dan bisa diulang, termasuk versi pelan.
Pilihannya adalah 4 tulisan kata dari dek yang sama. Setelah menjawab, tampil
Hanzi/kata, pinyin, arti, dan contoh kalimat. Di statistik, mode ini dihitung sebagai kuis.

## Latihan menulis (`/writing`)

Halaman tersendiri, terpisah dari hafalan flashcard dan tidak memengaruhi progres siklus.

- `/writing` mengikuti bahasa aktif. Untuk 華語 isinya daftar Buku → Bab dengan progres
  "x / y" per bab. Untuk Deutsch, halaman menampilkan "materi belum tersedia" sampai
  materi menulis Jerman ditambahkan; menunya tetap ada di navigasi.
- `/writing/[deckId]` berisi semua Hanzi unik bab itu, sesuai urutan kemunculannya, dan
  langsung membuka karakter pertama yang **belum ditulis**.
- **Mode tulis langsung aktif** begitu data goresan dimuat; tidak ada tombol "Tulis".
  Setelah 3 kali salah, petunjuk goresan muncul. Di akhir, jumlah goresan salah
  ditampilkan.
- **Lihat urutan goresan** hanya menganimasikan goresan yang **belum** ditulis, lalu
  latihan berlanjut dari goresan itu. Goresan yang sudah ditulis tetap tampil. Kalau
  karakternya sudah selesai, seluruh urutan diputar ulang dan latihan mulai dari awal.
- **Progres**: karakter yang selesai ditulis ditandai centang hijau di kisi karakter dan
  dihitung di "Selesai x / y". Progres disimpan per karakter dan per kursus, jadi 你 yang
  sudah ditulis di Bab 1 juga tercentang di bab lain.
  - Tamu: `localStorage` (`writing` di `goabroad.guest.v2`).
  - Akun: Firestore `users/{uid}/writing/{courseId}` → `chars` (ditulis dengan
    `arrayUnion`). Progres tamu ikut disalin ke akun saat login (`migrateGuestWriting`).
- Kisi 米字格 membantu menempatkan goresan.
- Data goresan dimuat dari `hanzi-writer-data` di jsDelivr. 1.556 dari 1.561 karakter
  buku 1–4 tersedia; 嚐 嬤 汙 崁 舺 menampilkan pesan "data belum tersedia".

## Ganti bahasa di setiap halaman

Header setiap halaman punya pemilih **Deutsch · 華語** (`HeaderCourseSwitcher`). Beranda
dan Deck memakai pemilih besar mereka sendiri. Navigasi bawah selalu sama untuk kedua
bahasa. Halaman yang terikat ke satu bahasa (sesi, level, dek tertentu, bab menulis,
bagian video) kembali ke halaman induknya saat bahasa diganti. Link langsung ke halaman
bahasa lain mengganti kursus **sekali** saat dibuka (`useActiveCourse`), jadi pilihan
dari header tidak dibatalkan.

## Batasan

- Kata satuan baru ada di 353 kata benda. CC-CEDICT tidak mencatat CL untuk semua kata
  benda (老師 tidak punya CL di CC-CEDICT).
- Arti Indonesia per karakter diambil dari kartu karakter tunggal di kursus. Artinya
  bisa berasal dari makna lain karakter itu (中 "sedang" di 客服中心), jadi arti Inggris
  CC-CEDICT selalu ditampilkan di sampingnya.
- Untuk kata 1–2 karakter, kalimat dicocokkan per kata, tapi tidak per arti.

## Membangun ulang

```bash
python3 scripts/content/zh/zh-enrich.py                                   # terapkan zh-enrichment.json
python3 scripts/content/zh/zh-enrich.py CEDICT.txt.gz dictionary.txt TATOEBA/  # pilih ulang
```

- `CEDICT.txt.gz`: `https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz`
- `dictionary.txt`: Make Me a Hanzi
- `TATOEBA/`: berisi `cmn_sentences.tsv`, `cmn_transcriptions.tsv`, `cmn-ind_links.tsv`,
  `cmn-eng_links.tsv`, `eng-ind_links.tsv`, `ind_sentences.tsv`, dan `eng_sentences.tsv`
  dari `https://downloads.tatoeba.org/exports/per_language/`.
