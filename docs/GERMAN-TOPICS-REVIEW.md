# Penataan topik Deutsch — 2026-10-21

Seluruh **9.483 kartu A1–C2** ditinjau ulang berdasarkan makna kata, menggunakan
konten pada commit `bd0e4f9` sebagai baseline. Penetapan kategori per lemma disimpan
secara eksplisit di `scripts/content/de-topic-assignments.json`, dengan katalog
pembatasan tema di `de-topic-catalog.json`. Hasilnya **228 deck topik** berukuran
maksimal 80 kartu, menggantikan 177 deck sebelumnya. **8.530 kartu berpindah deck**.
ID, level, arti, artikel, dan contoh kalimat semua kartu dipertahankan.

## Perbaikan pengelompokan

Kategori makanan, rumah, keluarga, tubuh, dan pakaian tersedia di seluruh level;
kosakata lanjutan tidak lagi kehilangan kategori tersebut hanya karena bandnya.
Agama dan mitologi, militer dan persenjataan, bahasa dan tulisan, serta bahan dan
satuan ukur dipisahkan agar tidak menumpuk dalam kategori yang tidak berhubungan.
Ada kategori tindakan umum, sifat umum, dan konsep abstrak untuk kata yang memang
bersifat lintas tema. Perbedaan penggunaan kata bermakna ganda tetap dijelaskan
pada kartu yang sama; kartu tidak diduplikasi antartopik.

Contoh keputusan kurasi:

| Kata | Penempatan |
| --- | --- |
| Waschbär, Stachelschwein | Alam, hewan & tumbuhan |
| Sparschwein | Pekerjaan, uang & ekonomi |
| Krankenschwester, Psychose | Kesehatan & perawatan |
| Komitee | Masyarakat, negara & politik |
| Zahnfleisch | Tubuh & pancaindra |
| Wettervorhersage, Schneesturm | Lingkungan, cuaca & geologi |
| Margarine, Brokkoli | Makanan & minuman |
| Bestechungsgeld | Hukum, kejahatan & keselamatan |
| Hashtag, Plattenspieler | Media, komunikasi digital & teknologi |
| Galaxie | Pendidikan, sains & pengetahuan |
| Pentagramm | Agama, mitologi & kepercayaan |

Aturan akhiran kata dan kata kunci terjemahan dari generator lama tidak lagi
menentukan kategori akhir. Contohnya `Psychose` bukan pakaian hanya karena
berakhiran `hose`, `Schneesturm` bukan bangunan hanya karena berakhiran `turm`,
dan `Komitee` bukan minuman hanya karena berakhiran `tee`. Penetapan eksplisit
juga menghindari pencocokan keliru seperti `mata-mata` sebagai anggota tubuh.

4.659 kartu yang sebelumnya berada di “Kosakata umum” kini memiliki kategori
hasil tinjauan. Laporan lengkap per level dan kategori tersimpan di
[`german-topic-audit.json`](./german-topic-audit.json).

## Pipeline dan identitas

`build-decks.py` tetap mengumpulkan kandidat serta menjalankan kurasi arti dan
penggabungan kata berulang. Langkah terakhir `reclassify_decks.py` memakai
inventaris kategori yang telah ditinjau. Kata baru tanpa penetapan kategori
menyebabkan build konten gagal agar tidak masuk kategori otomatis yang keliru.
Menjalankan klasifikasi ulang tidak mengubah ID ataupun urutan relatif sumber.
Topik kecil tetap dipertahankan apabila temanya berbeda; tidak digabung ke
kategori umum semata-mata untuk memenuhi ukuran minimum.

ID kartu tetap menyimpan bentuk ID historis, walaupun deck pemiliknya berubah.
Loader membaca ID eksplisit dan kategori ditentukan dari `card.topic`, bukan
prefix ID. `migration-map.json` dan `topic-map.json` historis tetap utuh untuk
akun yang belum membuka versi lama. `topic-map-v6.json` menyimpan tata letak 177
deck sebelumnya sebagai urutan suffix ID yang ringkas; isinya diverifikasi
terhadap keseluruhan baseline Git.

## Progres tamu dan akun

Migrasi tamu menggunakan `contentVersion = 6`, akun menggunakan `topicsV6`.
Migrasi kosakata v5 lebih dulu dijalankan menggunakan tata letak v5 sebenarnya;
setelah itu progres dipindah ke deck semantik baru dengan ID kartu yang sama.
Riwayat kartu yang sudah dipahami serta penghitung seumur hidup dipertahankan.
Jika seluruh kartu suatu topik baru pernah dipahami, topik itu tetap memiliki
status pernah dituntaskan. Topik yang komposisinya tidak berubah mempertahankan
putaran dan cursor aslinya.

Untuk topik yang berubah, cursor disusun ulang dari kartu yang sudah ditemui.
Kata yang belum dipahami—termasuk celah kartu yang belum pernah tampil sebelum
cursor baru—dimasukkan ke antrean sehingga tidak dilewati. Mandarin, deck kustom,
statistik harian, dan progres video tidak diklasifikasikan ulang.

Setiap batch akun menyimpan progres maksimal 80 kartu bersama cycle dan penanda
migrasinya secara atomik. Cursor sumber disimpan sampai seluruh batch selesai,
sehingga percobaan ulang setelah kegagalan sebagian penulisan tidak membaca
cursor baru sebagai posisi lama. Cycle lama yang tidak dipakai lagi dibersihkan.
Migrasi akun diselesaikan sebelum penggabungan tamu; snapshot tamu juga dinaikkan
ke versi 6 sebelum ditulis ke akun. Snapshot dipertahankan bila migrasi akun
belum selesai. Konten kartu tetap dibundel, tidak disalin ke Firestore.

## Pemeriksaan

```bash
source ./activate.sh
python3 scripts/content/audit_topics.py
python3 scripts/content/reclassify_decks.py
npm run typecheck && npm run lint && npm test && npm run seed:validate && npm run build
```

Audit membuktikan seluruh ID, level, dan isi kartu cocok dengan baseline,
9483 lemma memiliki tepat satu kategori, tidak ada kata duplikat, serta snapshot
migrasi benar. Validator mencocokkan kategori dan tag setiap kartu dengan
inventaris. Tes mencakup pemuatan seluruh deck, contoh salah klasifikasi,
terjemahan judul Indonesia/Inggris, migrasi dengan celah yang belum dipelajari,
progres yang sudah tuntas, pengulangan setelah batch sebagian selesai,
snapshot tamu lama, dan penggabungan tamu ke akun.

Rebuild penuh di folder sementara menghasilkan keenam deck, manifest, alias,
dan seluruh peta migrasi yang identik dengan hasil di worktree. Proses penataan
ulang juga diperiksa agar idempoten.
