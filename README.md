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
