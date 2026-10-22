# Cara baca Jerman dengan ejaan Indonesia (`readingId`)

Setiap kartu Jerman (9.483 kartu, A1–C2) punya field `readingId`, yaitu cara
membaca kata tersebut **dengan nilai huruf bahasa Indonesia menurut EYD V**, dipenggal
per suku kata. Field ini tampil di bawah kata Jerman pada flashcard, kuis, dan daftar
kartu. Contoh: *Wasser* → `wa-sa`, *Guten Morgen* → `gu-tên mor-gên`,
*Entschuldigung* → `ent-syul-di-gung`.

## Referensi

| Sisi | Referensi | Dipakai untuk |
| --- | --- | --- |
| Lafal Jerman | [Wiktionary Jerman](https://de.wiktionary.org/) (IPA mengikuti lafal baku Duden), dump [wiktextract/kaikki.org](https://kaikki.org/dewiktionary/) | IPA tiap kartu → `scripts/content/de-ipa.json` |
| Nilai huruf Indonesia | **EYD Edisi V** (SK Kepala Badan Bahasa, 16-08-2022), [PDF resmi](https://www.hpi.or.id/wp-content/uploads/2022/09/EYD-V_16082022.pdf) | huruf vokal & diakritik ê, diftong *ai/au/ei/oi*, gabungan *kh/ng/ny/sy*, lafal huruf *v* = [f], pemenggalan kata |
| Kontras Jerman–Indonesia | Jahrani dkk. 2023, *Perbedaan Fonologi Bahasa Indonesia dan Bahasa Jerman*, Sintaksis 1(4), [doi:10.61132/sintaksis.v1i4.208](https://doi.org/10.61132/sintaksis.v1i4.208) | vokal umlaut dan [ç], [x] tidak ada dalam bahasa Indonesia |
| Kesalahan pelajar Indonesia | Sabriana (UNY), *Analisis Kesalahan Pelafalan Bahasa Jerman Peserta Didik SMA Negeri I Majene* ([PDF](https://journal.student.uny.ac.id/jerman/article/viewFile/14489/14065)) | ö/ü salah lafal 100%, [v], [ts], [z], -er [ɐ] sering meleset |
| Ich-Laut | Hirschfeld & Reinke, lembar kerja *Ich- und Ach-Laut* ([ESV](https://www.esv.info/.download/homepage-addons/phonetik/lehrende/LB_Kapitel_9_Schwerpunkt_15_AB_Lehrende_2.Aufl._13.10.22.pdf)) | [ç] berbeda dari [ʃ] dan dari [x] |
| Panduan pelajar | [masuk-ptn.com](https://masuk-ptn.com/materi/pemahaman-teks-materi-bahasa-jerman-kelas-10/pengenalan-alfabet-dan-pelafalan-dasar) | ü = bibir "u" bunyi "i", ö = bibir "o" bunyi "e" |

## Tabel konversi (IPA → huruf EYD V)

| Bunyi Jerman | IPA | Ditulis | Alasan | Contoh |
| --- | --- | --- | --- | --- |
| w, v (bunyi v) | v | `w` | EYD V: huruf *v* dilafalkan [f], jadi `v` membuat *Wein* terbaca *fein* | *Wein* → wain |
| f, v | f | `f` | | *Vater* → fa-ta |
| s sebelum vokal | z | `z` | EYD V: *z* (zeni, lazim) | *sieben* → zi-bên |
| z, tz | t͡s | `ts` | | *zehn* → tsen |
| sch, s(p/t) di awal | ʃ | `sy` | EYD V: *sy* = satu bunyi (syarat) | *Schule* → syu-lê |
| tsch | t͡ʃ | `c` | EYD V: *c* (cakap) | *Tschüss* → cis |
| ch setelah e/i/ä/ö/ü/l/n/r, -ig | ç | `h` | tidak ada di bahasa Indonesia; paling dekat dengan *h* pada *putih*. `sy` tertukar dengan sch, `kh` adalah ach-Laut | *ich* → ih, *nicht* → niht |
| ch setelah a/o/u/au | x | `kh` | EYD V: *kh* (khusus, akhir) | *Buch* → bukh |
| j | j | `y` | EYD V: *y* (yakin) | *Junge* → yu-ngê |
| g/j pinjaman | ʒ, d͡ʒ | `j` | EYD V: *j* (jalan) | *Ingenieur* → in-je-ni-ea |
| ng, nk | ŋ | `ng` | EYD V: *ng* | *Danke* → dang-kê |
| r | ʁ | `r` | | *Brot* → brot |
| -er, r setelah vokal panjang | ɐ, ɐ̯ | `a` | lafal baku Duden: r divokalkan | *Wasser* → wa-sa, *vier* → fia |
| e, ä | e, ɛ | `e` | EYD V: e tanpa diakritik | *Tee* → te |
| e lemah | ə | `ê` | EYD V: ê dilafalkan [ə] | *Danke* → dang-kê |
| -en, -el silabis | n̩, l̩ | `ên`, `êl` | | *Apfel* → a-pfêl |
| ü | y, ʏ | `i` | tidak ada di bahasa Indonesia: ucapkan `i` dengan bibir bulat | *fünf* → finf |
| ö | ø, œ | `e` | tidak ada di bahasa Indonesia: ucapkan `e` dengan bibir bulat | *schön* → syen |
| ei, ai | aɪ̯ | `ai` | EYD V: diftong *ai* | *Wein* → wain |
| au | aʊ̯ | `au` | EYD V: diftong *au* | *Haus* → haus |
| eu, äu | ɔʏ̯ | `oi` | EYD V: diftong *oi* (*eu* di EYD V adalah monoftong [ɘ], jadi tidak dipakai) | *heute* → hoi-tê |
| vokal sengau (pinjaman Prancis) | ɑ̃ | `ang` | | *Restaurant* → res-to-rang |

## Pemenggalan suku kata (`-`)

Mengikuti EYD V bab Pemenggalan Kata (C.1.a–g):

- dua vokal berurutan yang bukan diftong dipenggal (*naiv* → na-if, seperti *ma-in*);
- satu konsonan di antara vokal masuk ke suku berikutnya (*Hallo* → ha-lo);
- dua konsonan dipenggal di tengah (*Danke* → dang-kê); tiga atau lebih, setelah
  konsonan pertama (*am-bruk*);
- *kh, ng, ny, sy* tidak dipenggal.

Dua penyesuaian untuk bahasa Jerman:

- Awal suku kata ditandai IPA Wiktionary (tanda tekanan ˈ ˌ dan hentian glotal ʔ),
  jadi kata majemuk dipenggal di batas katanya (*einkaufen* → ain-kau-fên,
  *beachten* → bê-akh-tên).
- Jika konsonan sisa di awal suku kata bukan gugus yang mungkin dalam bahasa Jerman,
  pemenggalan digeser ke kanan (*Examen* → ek-sa-mên, *Krankheit* → krangk-hait).

## Batasan

- **Panjang vokal dan tekanan tidak ditandai**, karena EYD V tidak punya penandanya
  (*Staat* dan *statt* sama-sama `sytat`). IPA lengkapnya ada di `de-ipa.json`.
- ü dan ö ditulis `i` dan `e`. Bibir tetap perlu dibulatkan; di penelitian UNY,
  bunyi inilah yang paling sering salah.
- Jika satu kata punya beberapa lafal di Wiktionary, yang dipakai adalah lafal pertama.
- Token yang tidak ada di Wiktionary (*Guten/Gute*, *Pyjama*, *Malware*, dan 7 entri
  yang IPA-nya hanya "…") diisi manual di `MANUAL_IPA`.

## Membangun ulang

```bash
python3 scripts/content/de-pronunciation.py                 # tulis readingId dari de-ipa.json
python3 scripts/content/de-pronunciation.py DUMP.jsonl.gz   # segarkan IPA dari dump dulu
```

`build-decks.py` memanggil `apply_pronunciation()` di akhir proses, jadi kartu hasil
build ulang tetap punya `readingId`. Setiap kali skrip dijalankan, self-check
memastikan contoh-contoh di atas tetap benar.
