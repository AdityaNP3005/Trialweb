# Audit kosakata Jerman — 2026-10-21

Seluruh 9.688 kartu Jerman A1–C2 pada `dcb466f` ditinjau. Hasilnya 9.483
kata unik dalam 177 topik: 205 kartu dari 196 kelompok digabung, termasuk
perbedaan kapitalisasi, artikel, jenis kata, dan variasi ejaan seperti
`Tschüss`/`tschüs`. Sinonim yang berupa kata berbeda tetap dipertahankan.

Makna yang berbeda tetap tersedia dengan konteks dalam satu kartu. Contohnya
`morgen` menjelaskan **besok** dan `der Morgen` menjelaskan **pagi**. `Band`
menjelaskan pita, jilid buku, dan grup musik beserta artikelnya. Terjemahan
Indonesia yang keliru atau rancu diperjelas, termasuk `Ruf` (panggilan/reputasi),
`Richter` (hakim), dan `fehlen` (tidak ada/kurang). Gloss Inggris yang keliru
ikut diperbaiki. Angka perubahan dan per-band ada di
[`german-vocab-audit.json`](./german-vocab-audit.json).

## Sumber kurasi

`de-gloss-overrides.json` menyimpan koreksi agar rebuild tidak mengembalikan
terjemahan lama. Key `kata|jenis` mengoreksi satu penggunaan, key `kata`
mengoreksi bentuk persisnya, dan key `@lemma` mengoreksi arti akhir gabungan.
`review_decks.py` menerapkannya setelah generator, tanpa mengisi ulang kuota
band menggunakan kata yang belum ditinjau. File kurasi sumber A1 tetap menjadi
input pipeline; konten yang tampil berasal dari enam deck hasil akhirnya.

Kata teknis/regional yang memerlukan pemeriksaan khusus dirujukkan ke entri
kamus, antara lain [gaumen](https://de.wiktionary.org/wiki/gaumen),
[Flott](https://de.wiktionary.org/wiki/Flott),
[Blas](https://de.wiktionary.org/wiki/Blas),
[Bear](https://de.wiktionary.org/wiki/Bear),
[House](https://de.wiktionary.org/wiki/House),
[Court](https://de.wiktionary.org/wiki/Court),
[Buff](https://de.wiktionary.org/wiki/Buff),
[back](https://de.wiktionary.org/wiki/back),
[Brauner](https://de.wiktionary.org/wiki/Brauner), dan
[Zentner](https://de.wiktionary.org/wiki/Zentner).
Lisensi konten tetap mengikuti [NOTICE.md](../NOTICE.md).

## Identitas dan progres

ID 9.483 kartu yang dipertahankan sama persis dengan ID sebelum audit; posisi
yang dihapus tidak dipakai ulang. Loader memakai `card.id` eksplisit. ID topik
serta kedua peta migrasi historis tetap sama. `review-aliases.json` memetakan
205 ID yang dihapus ke kartu kata yang sama pada level paling awal.

Migrasi tamu memakai `contentVersion = 5`. Migrasi akun `vocabV5` berjalan setelah
migrasi `topicsV4`. Riwayat duplikat digabung; status kartu utama dipertahankan,
dan riwayat yang hanya ada pada duplikat dijadwalkan kembali agar makna gabungan
terlihat. Penghitung seumur hidup memakai nilai maksimum agar tidak dihitung
ganda. Cursor disesuaikan terhadap posisi lama yang masih ada; nomor putaran
dan ID kartu lain dipertahankan. Penanda `vocabV5` per cycle membuat penyesuaian
cursor aman diulang setelah kegagalan sebagian penulisan cloud. Konten tidak
disalin ke Firestore. Mandarin dan deck kustom tetap di luar pemetaan ini.

## Verifikasi

```bash
source ./activate.sh
python3 scripts/content/audit_review.py
npm run typecheck && npm run lint && npm test && npm run seed:validate && npm run build
```

Audit membandingkan semua kartu dengan baseline Git: setiap kartu lama harus
masih ada dengan ID dan kata yang sama atau memiliki alias ke kata yang sama;
tidak boleh ada headword berulang. Validator juga memeriksa seluruh deck,
skema, ID, alias, hitungan manifest, dan topik. Tes memuat semua kartu melalui
loader aplikasi serta menguji penggabungan riwayat, perpindahan antartopik,
pengulangan migrasi, dan snapshot tamu versi 4 yang sebenarnya.

Rebuild penuh dengan cache sumber yang tersedia telah diperiksa di folder
sementara: enam deck, alias, dan manifest menghasilkan data yang sama. Menjalankan
ulang `review_decks.py` juga tidak mengubah hasil. Untuk perubahan klasifikasi
atau sumber di masa depan, prosedur migrasi topik di BRIEFING tetap diperlukan.

Cakupan audit ini adalah kata berulang dan kejelasan arti. Artikel/gender serta
contoh kalimat dari sumber otomatis masih belum lengkap; validator tetap
melaporkan kekurangan tersebut.
