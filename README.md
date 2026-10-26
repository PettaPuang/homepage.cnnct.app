# homepage.cnnct.app

Homepage CNNCT, studio ERP digital. Satu halaman: Hero, About, Services, Work, Contact.

## Stack

- Next.js 16 (App Router), React 19, Tailwind CSS 4
- GSAP + ScrollTrigger untuk animasi scroll
- three.js untuk fluid layer di hero (hanya desktop dengan pointer halus)
- Font: Inter dan DM Mono (`next/font/google`)

## Menjalankan

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build
npm run start
```

## Struktur

- `app/` layout, halaman, dan style global
- `components/site/` section dan animasi scroll (`handoff.ts` berisi pola handoff antar section)
- `components/fluid/` fluid canvas dan engine WebGL
- `content/site.ts` seluruh copy, layanan, dan daftar project
- `docs/alur-halaman.md` alur scroll dan perilaku tiap section

Next.js di repo ini punya perubahan dari versi yang umum dikenal. Baca `AGENTS.md` dan `node_modules/next/dist/docs/` sebelum menulis kode.

## Pintu owner

`/business` adalah login owner yang memegang beberapa bisnis. Halaman promosi `/` tetap publik. Tiap bisnis tetap ERP terpisah; pintu hanya menyimpan akun dan baris akses, lalu mengirim kode bertanda tangan ke ERP itu.

Env (nama saja, nilai di `.env` yang tidak di-commit):

- `DATABASE_URL` — Postgres milik homepage
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `PINTU_PRIVATE_KEY` — private key ES256, PKCS8, satu baris dengan `\n`
- `DEVELOPER_EMAIL`
- `DEVELOPER_PASSWORD` — minimal 8 karakter
- `DEVELOPER_NAME` — opsional

```bash
npm run keys:generate   # cetak pasangan kunci ke terminal, tidak menulis file
npx prisma db push      # dijalankan sendiri, setelah DATABASE_URL terisi
npm run seed:developer  # upsert satu akun developer dari env
```

Public key dari `keys:generate` dipasang di env `PINTU_PUBLIC_KEY` pada tiap ERP yang memakai pintu. Private key hanya di homepage.

### Pengingat: yang harus dilakukan

Di homepage ini:

1. Siapkan database Postgres, lalu isi `.env` (dan env Vercel): `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `PINTU_PRIVATE_KEY`, `DEVELOPER_EMAIL`, `DEVELOPER_PASSWORD`, `DEVELOPER_NAME`.
2. `npm run keys:generate` sekali saja. Salin seluruh baris `PINTU_PRIVATE_KEY=...` ke homepage, dan baris `PINTU_PUBLIC_KEY=...` ke ERP. Jangan dijalankan dua kali: pasangan kunci harus sama di kedua sisi.
3. `npm install`, `npx prisma db push`, lalu `npm run seed:developer`.
4. Buka `/business`, login sebagai developer, lalu di `/business/admin` buat akun owner dan tambah baris akses (nama bisnis dan alamat ERP `https://...`).
5. Sebelum deploy: pastikan semua env di atas ada di Vercel. Jangan commit `.env`.

Di tiap ERP yang memakai pintu:

1. Isi env `PINTU_PUBLIC_KEY` (dari langkah 2 di atas) dan `APP_BASE_URL` (origin ERP itu, persis, tanpa garis miring akhir). Tanpa `PINTU_PUBLIC_KEY`, halaman `/pintu` di ERP memberi 404 dan semua kode ditolak.
2. Untuk tiap owner: buat user di ERP (aktif, email terverifikasi) dengan email yang SAMA dengan akun pintunya. Sandi boleh beda.
3. Akun developer ERP tidak lewat pintu; tetap login langsung di ERP.

Catatan: alamat ERP di baris akses wajib `https`, jadi uji lokal butuh tunnel `https` atau preview Vercel. Layar admin belum bisa mengubah email akun; bila email berubah, hapus lalu buat ulang akun dan barisnya.
