# Artikel, jamak, dan contoh kalimat Jerman

`scripts/content/de-enrich.py` mengisi field yang masih kosong di kartu Jerman.
Nilai yang sudah ada (200 kartu A1 kurasi) tidak pernah ditimpa. Pilihan datanya
disimpan per ID kartu di `scripts/content/de-enrichment.json`, supaya build ulang
tidak perlu mengunduh apa pun dan datanya bisa diaudit.

| Field | Sumber | Cakupan |
| --- | --- | --- |
| `gender` (der/die/das) | Wiktionary Jerman: tag `masculine`/`feminine`/`neuter` entri kata benda pertama | 6.359 dari 6.534 kata benda (sisanya: kata benda khusus jamak, nama diri, entri tanpa tag) |
| `plural` | Wiktionary: bentuk nominatif jamak; untuk kata benda adjektival dipilih bentuk setelah *die* (*die Angestellten*) | 5.726 |
| `exampleDe` | Tatoeba (kalimat 3–12 kata, ≤ 90 karakter); jika tidak ada, contoh buatan dari Wiktionary (tanpa kutipan sastra) | 9.061 kartu |
| `exampleId` | Tatoeba: terjemahan langsung deu→ind, atau lewat terjemahan Inggrisnya (deu→eng→ind, ditandai `:pivot` di `exampleSource`) | 3.180 |
| `exampleEn` | Tatoeba deu→eng | 8.129 |

## Tampilan

- Artikel ditampilkan di depan kata benda dengan warna gender: **der** biru,
  **die** merah, **das** hijau. Teks `front` tidak diubah, jadi ID kartu dan
  pencocokan headword tetap aman. TTS mengucapkan artikel bersama katanya.
- Cara baca juga mendapat artikel: *Tisch* → `dea tisy`.
- Tombol siput memutar audio pada 60% kecepatan yang dipilih.

## Cara memilih kalimat

1. Bentuk-bentuk kata diambil dari tabel infleksi Wiktionary (*Tisch, Tische,
   Tisches*; *konstruiere, konstruierte*). Kata bantu dan partikel di tabel
   (*worden, sein, an*), bentuk imperatif (*wach!* = kata sifat *wach*), dan baris
   yang menyebut kata lain (bentuk maskulin *Berater* untuk *Beraterin*, simbol)
   dilewati. Bentuk harus berawalan 3 huruf yang sama dengan kata dasarnya.
2. Kata benda harus cocok persis dengan huruf besarnya. Di awal kalimat, hanya kata
   dasarnya yang diterima, karena *Küssen Sie Tom!* adalah kata kerja. Kata lain
   hanya boleh berhuruf besar di awal kalimat (*Toten* bukan contoh untuk *tot*).
3. Kalimat kata kerja yang berakhir dengan partikel (*Wachen Sie auf!*) ditolak,
   karena biasanya itu kata kerja terpisah lain.
4. Urutan prioritas: ada terjemahan Indonesia langsung > lewat Inggris > hanya Inggris,
   lalu kalimat yang belum dipakai kartu lain, lalu yang paling pendek.

## Batasan

- Kalimat dicocokkan per bentuk kata, bukan per arti. Homograf bisa mendapat kalimat
  dengan arti lain (*Heck* "buritan" mendapat *Hecken* "pagar tanaman", karena
  bentuknya sama).
- Kata kerja kuat kehilangan bentuk lampau seperti *ging* untuk *gehen* (aturan
  awalan 3 huruf), tetapi infinitif dan bentuk lain biasanya tetap menemukan kalimat.
- Terjemahan pivot berasal dari kalimat Inggris, jadi nuansanya bisa sedikit bergeser.
- 423 kartu belum punya contoh kalimat, kebanyakan istilah teknis atau kata langka.

## Membangun ulang

```bash
python3 scripts/content/de-enrich.py                          # terapkan de-enrichment.json
python3 scripts/content/de-enrich.py DUMP.jsonl.gz TATOEBA/   # pilih ulang dari data mentah
python3 scripts/content/de-pronunciation.py                   # cara baca + artikel
```

`TATOEBA/` berisi `deu_sentences.tsv`, `ind_sentences.tsv`, `eng_sentences.tsv`,
`deu-ind_links.tsv`, `deu-eng_links.tsv`, dan `eng-ind_links.tsv` dari
`https://downloads.tatoeba.org/exports/per_language/`. `build-decks.py` menjalankan
enrichment lalu pronunciation di akhir prosesnya.
