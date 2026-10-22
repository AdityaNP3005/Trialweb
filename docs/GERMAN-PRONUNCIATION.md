# Cara baca Jerman dengan ejaan Indonesia (`readingId`)

Setiap kartu Jerman (9.483 kartu, A1–C2) punya field `readingId`, yaitu cara
membaca kata tersebut **dengan nilai huruf bahasa Indonesia**. Field ini tampil di
bawah kata Jerman pada flashcard, kuis, dan daftar kartu. Contohnya *Wasser* →
`wasa`, *Tschüss* → `cis`, *Guten Morgen* → `guten morgen`.

## Sumber

1. **Lafal**: IPA dari [Wiktionary Jerman](https://de.wiktionary.org/), yang memakai
   lafal baku Jerman (Duden). Datanya diambil dari dump wiktextract
   (`https://kaikki.org/dewiktionary/raw-wiktextract-data.jsonl.gz`) dan disimpan
   per kartu di `scripts/content/de-ipa.json` supaya bisa diaudit. Token yang tidak
   ada di Wiktionary (bentuk infleksi *Guten/Gute*, beberapa kata pinjaman, dan
   7 entri yang IPA-nya cuma "…") diisi manual di `MANUAL_IPA`.
2. **Padanan huruf Indonesia**: mengikuti panduan pelafalan bahasa Jerman untuk
   pelajar Indonesia, misalnya [masuk-ptn.com: alfabet & pelafalan dasar](https://masuk-ptn.com/materi/pemahaman-teks-materi-bahasa-jerman-kelas-10/pengenalan-alfabet-dan-pelafalan-dasar)
   (sch = "sy", j = "y", ü = bibir "u" bunyi "i", ö = bibir "o" bunyi "e") dan
   [Univext: alfabet bahasa Jerman](https://univext.com/id/blog/38/alfabet-bahasa-jerman-panduan-lengkap)
   (z = "ts", w = bunyi v, ch dua macam).

## Tabel konversi (IPA → huruf Indonesia)

| Bunyi Jerman | IPA | Ditulis | Contoh |
| --- | --- | --- | --- |
| w, v (bunyi v) | v | `w` | *Wasser* → wasa |
| v, f | f | `f` | *Vater* → fata |
| s sebelum vokal | z | `z` | *sieben* → ziben |
| z, tz | t͡s | `ts` | *zehn* → tsén |
| sch, s(p/t) di awal | ʃ | `sy` | *Schule* → syule, *Sport* → syport |
| tsch | t͡ʃ | `c` | *Tschüss* → cis |
| ch setelah e/i/ä/ö/ü, -ig | ç | `sy` | *ich* → isy, *ruhig* → ruisy |
| ch setelah a/o/u | x | `kh` | *Buch* → bukh, *acht* → akht |
| j | j | `y` | *ja* → ya |
| g dari kata pinjaman (j/ge) | ʒ, d͡ʒ | `j` | *Ingenieur* → injéniea |
| ng, nk | ŋ | `ng` | *Danke* → dangke |
| r | ʁ | `r` | *Brot* → brot |
| -er, r setelah vokal panjang | ɐ, ɐ̯ | `a` | *Wasser* → wasa, *vier* → fia |
| e, ä (e taling) | e, ɛ | `é` | *Tee* → té |
| e lemah | ə | `e` | *Danke* → dangke |
| -en, -el (konsonan silabis) | n̩, l̩ | `en`, `el` | *Apfel* → apfel |
| ü | y, ʏ | `i` | *fünf* → finf |
| ö | ø, œ | `e` | *schön* → syen |
| ei, ai | aɪ̯ | `ai` | *Wein* → wain |
| au | aʊ̯ | `au` | *Haus* → haus |
| eu, äu | ɔʏ̯ | `oi` | *heute* → hoite |
| vokal sengau (pinjaman Prancis) | ɑ̃ | `ang` | *Restaurant* → réstorang |

Tanda tambahan:

- `'` memisahkan dua vokal yang **bukan** diftong (*naiv* → na'if) dan hentian
  glotal setelah vokal (*beachten* → be'akhten), seperti *sa'at* dalam bahasa Indonesia.
- `-` memisahkan huruf yang kalau digabung terbaca sebagai digraf Indonesia lain:
  n-g, n-y, k-h, s-y (*angeben* → an-gében).

## Batasan

- **Panjang vokal dan tekanan tidak ditandai**, karena ejaan Indonesia tidak punya
  penanda keduanya (*Staat* dan *statt* sama-sama `sytat`). IPA lengkapnya tetap ada
  di `de-ipa.json`.
- ü/ö ditulis `i`/`e`, jadi pengguna tetap perlu membulatkan bibir.
- Jika satu kata punya beberapa lafal di Wiktionary, yang dipakai adalah lafal pertama.

## Membangun ulang

```bash
python3 scripts/content/de-pronunciation.py            # tulis readingId dari de-ipa.json
python3 scripts/content/de-pronunciation.py DUMP.jsonl.gz  # segarkan IPA dari dump dulu
```

`build-decks.py` memanggil `apply_pronunciation()` di akhir proses, jadi kartu hasil
build ulang tetap punya `readingId`. Saat skrip dijalankan, self-check memastikan
contoh di tabel di atas tetap benar.
