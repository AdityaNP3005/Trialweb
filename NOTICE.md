# Atribusi konten

Deck Jerman A1–C2 di `src/content/de/` dibangun dari data terbuka berikut.

| Sumber | Dipakai untuk | Lisensi |
| --- | --- | --- |
| [WikDict](https://www.wikdict.com/) — pasangan `de-id` dan `de-en`, diturunkan dari Wiktionary | arti Indonesia, arti Inggris, jenis kata | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (`de_50k.txt`, dari OpenSubtitles) | urutan frekuensi & pembagian level | CC BY-SA 4.0 (konten) |
| Wiktionary (lewat WikDict) | verifikasi lemma | CC BY-SA 4.0 |
| [Wiktionary Jerman](https://de.wiktionary.org/) lewat dump [wiktextract/kaikki.org](https://kaikki.org/dewiktionary/) | IPA sumber cara baca (`readingId`, `scripts/content/de-ipa.json`); gender, jamak, dan contoh kalimat cadangan (`scripts/content/de-enrichment.json`) | CC BY-SA 4.0 |
| [Tatoeba](https://tatoeba.org/) (ekspor `deu`, `ind`, `eng` + tautan terjemahan) | contoh kalimat beserta terjemahan Indonesia/Inggris buatan manusia; ID kalimat dicatat di `exampleSource` | [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/) |

Kartu A1 yang dikurasi manual (`src/content/de/source/curated-a1.json`) ditulis
untuk proyek ini dan mengikuti lisensi yang sama.

## Konsekuensi lisensi

Karena sumbernya CC BY-SA 4.0, **konten turunan (file JSON deck) juga CC BY-SA 4.0**.
Jika kamu mempublikasikan ulang deck ini, sertakan atribusi di atas dan lisensi
yang sama.

## Catatan kualitas

- Arti Indonesia diambil dari terjemahan Wiktionary dengan skor minimum 0,5;
  terjemahan berbobot rendah dibuang agar tidak menyesatkan.
- Artikel/gender kata benda dan contoh kalimat belum tersedia dari sumber ini,
  sehingga kolom `gender` dan `exampleDe` boleh kosong pada deck hasil pipeline.
  Deck A1 mempertahankan 200 kartu kurasi yang sudah memiliki artikel dan contoh.

## Membangun ulang

```bash
mkdir -p .content-cache
curl -o .content-cache/de-id.sqlite3 https://download.wikdict.com/dictionaries/sqlite/2_2026-06/de-id.sqlite3
curl -o .content-cache/de-en.sqlite3 https://download.wikdict.com/dictionaries/sqlite/2_2026-06/de-en.sqlite3
curl -o .content-cache/de_50k.txt https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt
python3 scripts/content/build-decks.py
npm run seed:validate
```
