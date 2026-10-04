# Alur halaman CNNCT

Scroll berjalan dari atas dokumen sampai akhir. Setiap handoff memakai pola yang sama: section yang sedang aktif di-pin ke viewport, isinya selesai dulu, lalu ada pause, baru section berikutnya naik dari fold dan menutup viewport. Section yang pinned tidak ikut scroll sebelum section berikutnya mencapai `top: 0`.

Pause itu sekitar `0.4` tinggi viewport. Selama pause, tepi atas section berikutnya diam di fold (tepi bawah viewport), belum masuk.

Kalau `prefers-reduced-motion: reduce` aktif, timeline scroll tidak dijalankan. Copy tampil langsung.

---

## Hero

Section pertama mengisi viewport, background hitam. Copy: kicker `DIGITAL ERP STUDIO`, heading tiga baris `SYSTEMS` / `THAT MOVE` / `BUSINESS`, dan footer `EST. 2026` serta `MOVE TO EXPLORE`.

Entrance ini bukan scroll. Saat load, kicker, heading, dan footer masuk dari bawah. Kicker dan footer fade sambil translate. Heading masuk baris per baris, stagger.

Di desktop (`hover`, pointer halus, lebar viewport minimal 768px) ada fluid layer di belakang copy. `pointermove` menggeser fluid. Di mobile layer ini tidak diaktifkan, canvas tetap opacity 0.

Lalu hero di-pin (`end += 200%`). Scroll tidak menggeser section. Yang bergerak adalah wipe hitam yang mengganti heading.

Arah wipe tergantung breakpoint:

- Mobile, `max-width: 767px`: wipe dari bawah viewport ke atas (`scaleY`, origin bawah). Copy pengganti `connect` / `and control` / `business` terbuka lewat clip yang mengikuti tepi wipe.
- Desktop landscape, `min-width: 768px`: wipe dari kiri ke kanan (`scaleX`). Clip copy mengikuti tepi yang sama.
- Portrait, `min-width: 768px`: wipe dari atas viewport ke bawah (`scaleY`, origin atas).

Begitu wipe selesai, heading lama di-hide. Yang tertinggal di viewport adalah heading transisi. Hero tetap pinned. Pause: about belum naik.

Setelah pause, about translate dari fold sampai `top: 0` dan menutup hero. Hero tetap `position: fixed` selama cover. Pin hero baru lepas setelah about menutup seluruh viewport.

---

## About

Label `ABOUT`. Heading dua baris. Bahasa awal Inggris:

`A minimal framework for presenting digital ERP products,`

`control every business flow from one platform.`

Click pada copy men-toggle ke Indonesia:

`Kerangka sederhana untuk menampilkan produk ERP digital,`

`kendalikan setiap alur bisnis dari satu platform.`

Baris pertama sudah ada di section begitu about cover hero. About di-pin saat `top` section menyentuh `top` viewport (`end += 200%`). Baris kedua belum di viewport. Ia translate dari fold, scroll-linked, sampai sejajar di bawah baris pertama.

Kedua baris lalu diam. Pause. Services belum naik.

Setelah pause, Services naik dari fold bersama headernya. Background Services hitam, jadi ia menutup copy about. About tetap pinned, kedua baris tidak ikut scroll, sampai Services `top: 0` dan menutup viewport. Baru pin about lepas.

---

## Services

Background hitam, copy putih. Header di dalam section: label `WHAT WE DO`, judul `SERVICES`.

Header masuk lebih dulu, bersama section yang cover about. Section di-pin (`end += 200%`). Body kartu kemudian translate dari fold.

Tiga kartu:

1. `Dedicated SaaS ERP` — `An ERP built specifically for your own business.`
2. `Custom Operation` — `Fully customized business-flow operations.`
3. `Business Compliance` — `Business and accounting guidance, with priority support.`

Click pada deskripsi men-toggle bahasa, sama seperti about.

Di desktop grid tiga kolom. Nomor di atas judul.

Di mobile (`max-width: 767px`) section `height: 100svh`. Kartu satu kolom, tiga baris sama tinggi. Nomor di kolom kiri, judul dan deskripsi di kolom kanan.

Setelah body masuk, section diam. Pause. Work belum naik.

Setelah pause, Work naik dari fold bersama headernya dan cover Services. Services tetap pinned sampai Work `top: 0`. Baru pin Services lepas.

---

## Work

Background putih. Header: label `SELECTED SYSTEMS`, judul `WORK`.

Header masuk lebih dulu dan ikut pin. Body daftar translate dari fold.

Delapan baris. Tiap baris: nomor, nama, ringkasan, tautan, tahun. TAMA, KAYUWA, dan JIYUU punya logomark di kiri nama. Mark Kayuwa berganti putih saat baris di-hover.

1. `CONNECT`, 2026, `connect.cnnct.app`. ERP umum. POS dan akuntansi.
2. `TAMA`, 2025, `tamaindonesia.cnnct.app`. ERP retail: operasi, inventori, akuntansi, HRD.
3. `KAYUWA`, 2025, `kayuwaindonesia.cnnct.app`. ERP manufaktur laser-cutting.
4. `NOZZL`, 2025, `nozzl.id`. Operasi SPBU.
5. `JIYUU`, 2026, `jiyuucoffee.cnnct.app`. ERP kafe: POS, inventori, resep, shift, banyak lokasi.
6. `BACKSTAGE`, 2026, `backstage.cnnct.app`. ERP roastery: proses roasting, resep, inventori, penjualan, pembelian, aset, dan akuntansi.
7. `ADM`, 2026, `azkadermawanmotor.cnnct.app`. ERP jual beli mobil: penjualan, inventori, pembelian, aset, akuntansi, dan kapitalisasi inventori.
8. `PRISMA`, 2026, `prisma.cnnct.app`. ERP kontraktor konstruksi dan interior: biaya proyek, anggaran, tagihan, dan progres tiap pekerjaan.

Tinggi daftar lebih besar dari viewport. Header tetap di atas viewport. Body terus di-translate ke atas sampai baris terakhir mencapai fold. Header tidak ikut turun ke bawah daftar.

Setelah baris terakhir sampai fold, pause. Contact belum naik.

Setelah pause, contact naik dari fold dan cover Work. Work tetap pinned sampai contact `top: 0`. Baru pin Work lepas.

---

## Contact

Section terakhir. Background hitam. Label `START A CONVERSATION`, heading `Have a system in mind?`, lalu dua tautan: email `admin@cnnct.app` dan Instagram `cnnct.app`.

Tinggi section mengikuti tinggi Work, supaya background hitam sampai akhir dokumen. Isi di dalam `.contact-pin`, `position: sticky; top: 0`, `min-height: 100svh`. Scroll sisa tidak menggeser heading dan tautan keluar viewport.

Footer di dasar pin, inset mengikuti `--page-gutter`: `© 2026 CNNCT.APP` di kiri, `BACK TO TOP` di kanan.
