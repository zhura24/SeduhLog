# SeduhLog: PWA Jurnal Seduh Kopi dan Cupping Notes Pribadi

SeduhLog adalah aplikasi jurnal seduh kopi untuk menyimpan resep, profil Biji Kopi, rating, dan cupping notes. Proyek tugas akhir praktikum Pemrograman Perangkat Bergerak ini menggunakan PWA React dan REST API Express sendiri.

## Fitur

- Dashboard dengan statistik dan grafik seduhan 8 minggu.
- Pengelolaan koleksi Biji Kopi dan jurnal seduhan, pencarian, filter, pagination, favorit, serta detail data.
- Arsip untuk Biji Kopi dan Seduhan; memulihkan Biji Kopi juga memulihkan Seduhan yang ikut diarsipkan bersamanya. Penghapusan permanen tersedia dengan konfirmasi.
- Pesan validasi ditampilkan pada kolom terkait dan dirangkum agar pengguna tahu bagian yang perlu diperbaiki.
- Timer resep seduh dengan langkah, rasio, suhu, progress, bunyi, getar, dan dukungan Wake Lock bila tersedia.
- Ilustrasi animasi pada timer yang berubah mengikuti metode seduh dan langkah aktif, termasuk efek menuang, blooming, pengepresan, dan ekstraksi.
- Kalkulator rasio kopi/air, tema terang/gelap/sistem, status online/offline, dan dukungan instalasi PWA.
- Tab Profil berisi identitas pengembang; informasi aplikasi dan pengaturan tersedia sebagai halaman terpisah dari Profil.
- API REST Express + Supabase PostgreSQL, validasi Zod, dan skrip data contoh.

## Tangkapan layar

Tambahkan tangkapan layar Beranda, Seduhan, Biji Kopi, Timer, dan Profil di sini sebelum pengumpulan.

## Arsitektur

- `client/`: React 18, Vite, React Router, TanStack Query, Tailwind CSS, dan Workbox PWA.
- `server/`: Express 4 REST API, PostgreSQL, Zod, dan Vitest/Supertest.
- Login belum tersedia; seluruh pengguna saat ini melihat dan mengubah data bersama yang sama. Server membutuhkan Supabase PostgreSQL untuk penyimpanan persisten.

## Menjalankan lokal

Prasyarat: Node.js 20+ dan npm.

1. Buat project di Supabase. Buka **Project Settings → Database → Connection string → Transaction pooler**, pilih URI, lalu salin connection string. Transaction pooler direkomendasikan untuk backend serverless. Ganti placeholder password di URI secara lokal; jangan kirim atau commit password.
2. Salin `server/.env.example` menjadi `server/.env`, lalu isi `DATABASE_URL` dengan connection string Supabase. Jangan unggah `.env`.
3. Isi `CLIENT_ORIGIN=http://localhost:5173` dan `NODE_ENV=development` pada `server/.env`. Tabel, indeks, serta kolom Arsip untuk database yang sudah ada dibuat atau ditambahkan otomatis saat API pertama kali dijalankan.
4. Salin `client/.env.example` menjadi `client/.env`. Untuk lokal, gunakan `VITE_API_BASE_URL=http://localhost:5000/api`.
5. Dari root project jalankan `npm install`, `npm install --prefix server`, dan `npm install --prefix client`.
6. Untuk data demonstrasi, jalankan `npm run seed --prefix server`.
7. Jalankan backend dengan `npm run dev --prefix server` dan frontend pada terminal lain dengan `npm run dev --prefix client`. Buka alamat Vite yang ditampilkan (umumnya `http://localhost:5173`).
8. Jalankan tes dengan `npm test --prefix server` dan `npm test --prefix client`; build frontend dengan `npm run build --prefix client`.

### Endpoint API

Semua endpoint memakai prefix `/api`: `GET /health`, `GET /methods`, CRUD `/beans` dan `/brews`, daftar arsip `GET /archive/beans` dan `GET /archive/brews`, pemulihan `PATCH /archive/{beans|brews}/:id/restore`, penghapusan permanen `DELETE /archive/{beans|brews}/:id`, `PATCH /brews/:id/favorite`, serta `GET /stats`. `DELETE /beans/:id` mengarsipkan Biji Kopi beserta Seduhan terkait; `DELETE /brews/:id` mengarsipkan Seduhan. Daftar dan filter menerima query pagination `page` dan `limit`. Error memakai bentuk `{ success, message, errors }`, dengan field dan pesan validasi yang dapat ditampilkan langsung di form. Kolom Arsip ditambahkan secara otomatis saat API berjalan, tanpa menghapus isi tabel.

## Deploy gratis

Urutan deployment:

1. Buat project Supabase dan ambil URI **Transaction pooler** dari **Project Settings → Database → Connection string**. Simpan password database dengan aman.
2. Push perubahan aplikasi ke GitHub. Vercel akan membangun ulang project backend dari repository.
3. Pada project backend Vercel (`seduh-log.vercel.app`), tambahkan `DATABASE_URL` dari Supabase di **Settings → Environment Variables** untuk Production, lalu deploy ulang. Pastikan `CLIENT_ORIGIN` berisi origin frontend Vercel tanpa path.
4. Pada project frontend Vercel, pastikan `VITE_API_BASE_URL` mengarah ke backend, misalnya `https://seduh-log.vercel.app/api`, lalu deploy ulang jika nilainya berubah.
5. Setelah deployment selesai, periksa `https://seduh-log.vercel.app/api/health` dan buka aplikasi. Supabase Free dapat memiliki batas penggunaan dan dapat pause saat lama tidak aktif.

## Memasang aplikasi

- Android: buka URL HTTPS menggunakan Chrome, pilih **Pasang aplikasi** atau menu **Tambahkan ke layar utama**.
- iOS: buka URL HTTPS menggunakan Safari, ketuk **Bagikan**, lalu pilih **Tambah ke Layar Utama**.
- PWA dan service worker memerlukan HTTPS (localhost dikecualikan). Kunjungi aplikasi setidaknya sekali saat online untuk cache app shell. Timer dan kalkulator bekerja offline; tulis data membutuhkan koneksi.

## Keputusan Desain

- Belum ada autentikasi atau pemisahan data antar pengguna; seluruh perubahan termasuk pengarsipan berlaku pada data bersama.
- Supabase PostgreSQL digunakan untuk penyimpanan persistensi. Skrip seed memasukkan 17 Biji Kopi dan 50 seduhan contoh hanya ketika database kosong; seed tidak menghapus data yang sudah ada.
- Penghapusan biasa memindahkan data ke Arsip. Penghapusan permanen Biji Kopi juga menghapus semua Seduhan terkait dan hanya dapat dilakukan setelah konfirmasi; pemulihan hanya mengembalikan Seduhan yang sebelumnya ikut diarsipkan bersama Biji Kopi tersebut.
- Antarmuka menggunakan bahasa Indonesia dan dirancang mobile-first dengan navigasi lima tab.
- Informasi pengembang pada Profil dikelola terpusat di `client/src/config/profile.js`.
- Timer menyimpan timestamp saat berjalan, bukan menambahkan durasi berdasarkan jumlah interval, agar tetap akurat saat tab tidak aktif.

## Batasan yang diketahui

- Belum ada sinkronisasi antrean tulis ketika offline; permintaan tulis ditolak dan form tetap berada di layar.
- Grafik menggunakan batang CSS sederhana; tidak memakai pustaka chart.
- Free hosting dapat memiliki cold start, kuota, dan batas kapasitas layanan.
- Lighthouse perlu diukur pada URL deployment dan perangkat sasaran; hasil dapat berbeda menurut jaringan/perangkat.
- Ikon PNG instalasi dibuat dari `client/public/logo.svg` menggunakan `npm run generate-pwa-assets --prefix client`.

## Profil aplikasi

Judul TA: **SeduhLog: PWA Jurnal Seduh Kopi dan Cupping Notes Pribadi**  
Repositori aplikasi (tautan awal): https://github.com/zhura24/seduhlog
