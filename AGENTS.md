<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GoAbroad — baca dulu sebelum menulis kode

Repo ini adalah **GoAbroad** (Next.js 16 + Firebase + Vercel), aplikasi flashcard Bahasa
Jerman A1–C2 dengan engine siklus per topik. Kondisi terkini, invariant yang tidak boleh
dilanggar, gotchas, dan TODO ada di:

- [`docs/BRIEFING.md`](./docs/BRIEFING.md) — status teknis, peta file, perintah, cara verifikasi.
- [`docs/PRD.md`](./docs/PRD.md) — kebutuhan produk, acceptance criteria, roadmap.

Aturan singkat: Node privat di `.node/` (`source ./activate.sh`); dev/start hanya `127.0.0.1`
dan matikan dengan `pkill -f next-server`; jangan renumber ID kartu/topik; konten tidak disalin
ke Firestore per akun; jangan tambahkan `firebase-admin`; gate sebelum commit =
`npm run typecheck && npm run lint && npm test && npm run seed:validate && npm run build`.
