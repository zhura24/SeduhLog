# SeduhLog: PWA Jurnal Seduh Kopi dan Cupping Notes Pribadi

SeduhLog adalah aplikasi jurnal personal untuk menyimpan resep seduh kopi, profil biji, rating, dan cupping notes. Proyek tugas akhir praktikum Pemrograman Perangkat Bergerak ini menggunakan PWA React dan REST API Express sendiri.

## Fitur

- Dashboard dengan statistik dan grafik seduhan 8 minggu.
- CRUD koleksi biji dan jurnal seduhan, pencarian, filter, pagination, favorit, serta detail data.
- Timer resep seduh dengan langkah, rasio, suhu, progress, bunyi, getar, dan dukungan Wake Lock bila tersedia.
- Kalkulator rasio kopi/air, tema terang/gelap/sistem, status online/offline, dan dukungan instalasi PWA.
- API REST Express + MongoDB/Mongoose, validasi Zod, dan skrip data contoh.

## Tangkapan layar

Tambahkan tangkapan layar Beranda, Seduhan, Biji, Timer, dan Profil di sini sebelum pengumpulan.

## Arsitektur

- `client/`: React 18, Vite, React Router, TanStack Query, Tailwind CSS, dan Workbox PWA.
- `server/`: Express 4 REST API, Mongoose, MongoDB Atlas, Zod, dan Vitest/Supertest.
- Data bersifat personal/tanpa login. Server membutuhkan MongoDB untuk penyimpanan persisten.

## Menjalankan lokal

Prasyarat: Node.js 20+ dan npm.

1. Siapkan MongoDB Atlas M0: buat akun dan cluster gratis, buat database user, lalu di Network Access tambahkan IP yang digunakan. Untuk praktik lokal mudah, Atlas menyediakan opsi `0.0.0.0/0`; batasi ke IP tertentu bila memungkinkan.
2. Salin `server/.env.example` menjadi `server/.env`, isi `MONGODB_URI` dengan connection string Atlas termasuk nama database `seduhlog`. Jangan unggah `.env`.
3. Isi `CLIENT_ORIGIN=http://localhost:5173` dan `NODE_ENV=development` pada `server/.env`.
   Jika Node.js gagal mencari record DNS SRV Atlas (`querySrv ECONNREFUSED`), tambahkan `MONGODB_DNS_SERVERS=1.1.1.1,1.0.0.1` agar backend dan skrip seed memakai resolver DNS tersebut.
4. Salin `client/.env.example` menjadi `client/.env`. Untuk lokal, gunakan `VITE_API_BASE_URL=http://localhost:5000/api`.
5. Dari root project jalankan `npm install`, `npm install --prefix server`, dan `npm install --prefix client`.
6. Untuk data demonstrasi, jalankan `npm run seed --prefix server`.
7. Jalankan backend dengan `npm run dev --prefix server` dan frontend pada terminal lain dengan `npm run dev --prefix client`. Buka alamat Vite yang ditampilkan (umumnya `http://localhost:5173`).
8. Jalankan tes dengan `npm test --prefix server` dan `npm test --prefix client`; build frontend dengan `npm run build --prefix client`.

### Endpoint API

Semua endpoint memakai prefix `/api`: `GET /health`, `GET /methods`, CRUD `/beans`, CRUD `/brews`, `PATCH /brews/:id/favorite`, serta `GET /stats`. Daftar dan filter menerima query pagination `page` dan `limit`. Error memakai bentuk `{ success, message, errors }`; penghapusan biji yang masih direferensikan seduhan menghasilkan HTTP 409.

## Deploy gratis

Urutan deployment:

1. Buat cluster MongoDB Atlas M0, database user, dan akses jaringan yang sesuai. Simpan connection string di tempat aman.
2. Buat Web Service Render dari repo ini dengan konfigurasi `render.yaml`. Isi `MONGODB_URI` pada environment Render. Setelah URL frontend Vercel tersedia, isi `CLIENT_ORIGIN` dengan origin frontend tersebut (tanpa path). Health check ada di `/api/health`.
3. Buat project Vercel dengan Root Directory `client`. SPA rewrite sudah disiapkan di `client/vercel.json`. Isi `VITE_API_BASE_URL` dengan URL Render, misalnya `https://seduhlog-api.onrender.com/api`, lalu deploy ulang.
4. Kembali ke Render dan atur `CLIENT_ORIGIN` menjadi URL Vercel persis, misalnya `https://nama-project.vercel.app`, kemudian deploy ulang backend.
5. MongoDB Atlas free tier dapat dipakai sebagai database. Aplikasi free tier Render dapat tidur saat idle sehingga cold start API mungkin memerlukan waktu.

## Memasang aplikasi

- Android: buka URL HTTPS menggunakan Chrome, pilih **Pasang aplikasi** atau menu **Tambahkan ke layar utama**.
- iOS: buka URL HTTPS menggunakan Safari, ketuk **Bagikan**, lalu pilih **Tambah ke Layar Utama**.
- PWA dan service worker memerlukan HTTPS (localhost dikecualikan). Kunjungi aplikasi setidaknya sekali saat online untuk cache app shell. Timer dan kalkulator bekerja offline; tulis data membutuhkan koneksi.

## Keputusan Desain

- Pengguna tunggal tanpa autentikasi sesuai cakupan TA; API tidak menyediakan pemisahan data antar pengguna.
- MongoDB Atlas digunakan untuk penyimpanan persistensi dan seed berisi 6 biji serta 15 seduhan contoh.
- Antarmuka menggunakan bahasa Indonesia dan dirancang mobile-first dengan navigasi lima tab.
- Data identitas pada `client/src/config/profile.js` mengikuti informasi dalam spesifikasi; periksa kembali nama, NIM, prodi, universitas, dan tautan GitHub sebelum publikasi.
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
