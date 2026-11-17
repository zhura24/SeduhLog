# Dokumentasi Proyek Tugas Akhir Praktikum

## SeduhLog: PWA Jurnal Seduh Kopi dan Cupping Notes Pribadi

Dokumen ini merangkum tujuan aplikasi, fitur yang tersedia, rancangan teknis, dan perubahan yang dilakukan dari spesifikasi awal pada [`PROMPT_SeduhLog.md`](./PROMPT_SeduhLog.md). Uraian berfokus pada implementasi proyek saat ini.

## 1. Deskripsi Aplikasi

SeduhLog adalah aplikasi jurnal seduh kopi untuk membantu pengguna mencatat, mengelola, dan meninjau aktivitas menyeduh kopi. Pengguna dapat menyimpan informasi Biji Kopi, parameter penyeduhan, penilaian rasa, dan catatan cupping. Aplikasi juga menyediakan timer dengan panduan langkah penyeduhan dan kalkulator rasio kopi terhadap air. Saat ini aplikasi belum memiliki login sehingga seluruh pengguna melihat dan mengubah data bersama yang sama.

SeduhLog dibuat sebagai **Progressive Web App (PWA)** dengan antarmuka berbahasa Indonesia dan rancangan mobile-first. Aplikasi dapat dibuka melalui browser dan dipasang ke layar utama perangkat yang mendukung PWA. Data disimpan melalui REST API buatan sendiri ke basis data PostgreSQL yang di-host di Supabase.

### Tujuan

- Menyediakan jurnal digital untuk mengarsipkan resep dan hasil seduhan kopi.
- Membantu pengguna mengelola koleksi Biji Kopi beserta asal, proses, tingkat sangrai, dan catatan rasa.
- Membantu proses penyeduhan dengan preset metode, timer, dan kalkulator rasio.
- Menampilkan statistik sederhana agar pengguna dapat meninjau kebiasaan dan hasil seduhannya.
- Memenuhi kebutuhan proyek TA praktikum: PWA, API buatan sendiri, navigasi bawah, halaman daftar dan detail, profil, serta deployment daring.

## 2. Fitur Aplikasi

### Splash Screen dan Onboarding

Saat aplikasi dibuka, splash-screen menampilkan tiga tahap pengenalan SeduhLog. Pengguna dapat berpindah tahap dengan mengetuk ilustrasi cangkir atau indikator tahap, lalu memilih **Lewati** atau **Mulai** untuk masuk ke aplikasi. Ilustrasi cangkir, uap/air seduhan, dan elemen Biji Kopi memiliki animasi. Tata letaknya menyesuaikan ukuran layar: dua kolom pada desktop dan terpusat pada ponsel. Tiga indikator tahap berukuran sama agar tetap simetris; tahap aktif dibedakan dengan warna. Animasi mengikuti preferensi aksesibilitas `prefers-reduced-motion`.

### Beranda

Beranda menampilkan ringkasan jurnal, termasuk jumlah seduhan, rata-rata rating, metode favorit, Biji Kopi teratas, grafik seduhan mingguan, dan seduhan terbaru. Jika belum ada catatan, aplikasi menampilkan keadaan kosong yang mengarahkan pengguna untuk mulai mencatat.

### Jurnal Seduhan

Pengguna dapat melihat, mencari, memfilter, mengurutkan, dan membuka detail catatan seduhan. Data seduhan mencakup Biji Kopi yang digunakan, metode, dosis kopi, jumlah air, suhu, ukuran gilingan, waktu, TDS, rating, cupping, tag rasa, catatan, tanggal, dan status favorit. Seduhan dapat ditambah, diperbarui, diarsipkan, dipulihkan, dihapus permanen, dan ditandai sebagai favorit.

### Koleksi Biji Kopi

Pengguna dapat melihat, mencari, memfilter, dan mengurutkan koleksi Biji Kopi. Informasinya mencakup nama, asal, roaster, proses, tingkat sangrai, varietas, ketinggian, tanggal sangrai, catatan rasa, gambar, dan catatan tambahan. Detail Biji Kopi juga menampilkan jumlah/rating seduhan terkait. Mengarsipkan Biji Kopi turut mengarsipkan Seduhan yang masih aktif dan terkait.

### Timer dan Kalkulator

Timer menyediakan preset untuk beberapa metode seduh. Langkah aktif, waktu, dan target air ditampilkan selama proses berlangsung. Kalkulator membantu menghitung kebutuhan air atau dosis berdasarkan rasio. Timer dan kalkulator berjalan di sisi klien sehingga dapat digunakan ketika perangkat sedang offline.

### Profil dan Pengaturan

Halaman Profil berisi informasi pengembang dan aplikasi, akses ke Arsip, pilihan tema, status koneksi, serta petunjuk atau tombol pemasangan aplikasi sesuai kemampuan browser dan perangkat. Dari Arsip, pengguna dapat memulihkan data atau menghapusnya permanen dengan konfirmasi; penghapusan permanen Biji Kopi juga menghapus seluruh Seduhan terkait.

## 3. Navigasi dan Halaman

Aplikasi memakai lima tab navigasi utama:

| Tab | Fungsi |
|---|---|
| Beranda | Statistik dan ringkasan jurnal |
| Seduhan | Daftar, pencarian, filter, dan pengelolaan seduhan |
| Biji Kopi | Daftar dan pengelolaan koleksi Biji Kopi |
| Timer | Timer seduh dan kalkulator rasio |
| Profil | Profil pengembang, Arsip, informasi aplikasi, dan pengaturan |

Setiap daftar utama menyediakan akses ke halaman detail. Form tambah dan ubah digunakan untuk mengelola data Biji Kopi maupun seduhan.

Validasi form menampilkan ringkasan kolom bermasalah, pesan di dekat kolom terkait, dan memindahkan fokus ke kesalahan pertama. Kesalahan bertingkat seperti nilai cupping diarahkan ke bagian Catatan cupping.

## 4. Arsitektur dan Teknologi

SeduhLog menggunakan arsitektur client-server:

1. **Frontend** menampilkan PWA dan berkomunikasi dengan backend melalui HTTP.
2. **Backend** menyediakan REST API, memvalidasi permintaan, dan menjalankan operasi basis data.
3. **Basis data** menyimpan data biji kopi dan seduhan secara persisten.

| Bagian | Teknologi |
|---|---|
| Frontend | React 18, JavaScript, Vite, React Router, TanStack Query |
| Antarmuka | Tailwind CSS, Lucide React, Fraunces dan Inter |
| PWA | `vite-plugin-pwa`, Workbox, Web App Manifest |
| Backend | Node.js, Express, Zod |
| Basis data | Supabase PostgreSQL, diakses menggunakan `pg` |
| Pengujian backend | Vitest dan Supertest |
| Pengujian frontend | Vitest |
| Hosting | Vercel untuk frontend dan backend; Supabase untuk PostgreSQL |

Frontend mengakses backend melalui satu modul API agar konfigurasi alamat server dan penanganan respons/error konsisten. Backend memisahkan konfigurasi aplikasi, route, validasi, middleware, dan akses basis data.

## 5. Rancangan Data

Basis data utama memiliki dua tabel:

- **`beans`** menyimpan profil Biji Kopi.
- **`brews`** menyimpan catatan seduhan dan memiliki relasi `bean_id` ke `beans.id`.

Kedua tabel menggunakan UUID sebagai identitas. Relasi seduhan ke Biji Kopi menggunakan foreign key. Kolom `archived_at` menandai data yang berada di Arsip; kolom `archived_with_bean` pada Seduhan membedakan data yang ikut diarsipkan bersama Biji Kopi dari Seduhan yang diarsipkan sendiri, sehingga pemulihan tidak mengubah keputusan arsip sebelumnya. Migrasi menambahkan kolom Arsip secara aditif ketika API dijalankan. Kolom dan nilai penting memiliki batasan basis data, misalnya rentang dosis, air, suhu, rating, serta pilihan metode dan tingkat sangrai.

API juga menghitung data turunan seperti rasio air terhadap kopi dan rata-rata nilai cupping. Endpoint statistik menyajikan jumlah seduhan/Biji Kopi, rata-rata rating, metode favorit, Biji Kopi teratas, dan jumlah seduhan per minggu.

## 6. REST API

Endpoint API menggunakan prefix `/api`. Endpoint utama meliputi:

| Endpoint | Fungsi |
|---|---|
| `GET /api/health` | Pemeriksaan kesehatan server |
| `GET /api/methods` | Mengambil preset metode seduh |
| `/api/beans` | Membaca, membuat, memperbarui, dan mengarsipkan Biji Kopi |
| `/api/beans/:id` | Mengambil atau mengubah detail Biji Kopi |
| `/api/brews` | Membaca, membuat, memperbarui, dan mengarsipkan catatan seduhan |
| `/api/brews/:id` | Mengambil atau mengubah detail seduhan |
| `PATCH /api/brews/:id/favorite` | Mengubah status favorit |
| `GET /api/archive/beans`, `GET /api/archive/brews` | Mengambil data yang diarsipkan |
| `PATCH /api/archive/beans/:id/restore`, `PATCH /api/archive/brews/:id/restore` | Memulihkan data dari Arsip |
| `DELETE /api/archive/beans/:id`, `DELETE /api/archive/brews/:id` | Menghapus data Arsip secara permanen |
| `GET /api/stats` | Mengambil statistik jurnal |

Permintaan yang mengubah data divalidasi menggunakan Zod. Pesan error menyertakan nama field yang bermasalah. Daftar mendukung pencarian, filter, pengurutan, dan pagination; statistik dan daftar aktif tidak memasukkan data Arsip.

## 7. Perubahan dari Spesifikasi Awal

Spesifikasi awal pada `PROMPT_SeduhLog.md` menjadi dasar fitur dan teknologi aplikasi. Beberapa keputusan infrastruktur dan data kemudian disesuaikan:

| Aspek | Spesifikasi awal | Implementasi saat ini |
|---|---|---|
| Basis data | MongoDB Atlas | Supabase PostgreSQL |
| Akses basis data | Mongoose | Driver `pg` dan query SQL |
| Hosting backend | Render | Vercel |
| Hosting frontend | Vercel atau Netlify | Vercel |
| ID dan relasi data | MongoDB ObjectId dan reference | UUID dan foreign key PostgreSQL |
| Seed awal | 6 Biji Kopi dan 15 seduhan; seed awal dirancang mengganti data | Menggunakan dataset contoh yang diberikan: 17 Biji Kopi dan 50 seduhan |
| Perilaku seed | Menghapus data lama lalu mengisi data | Berjalan dalam transaksi dan dilewati jika tabel sudah berisi data, sehingga tidak menimpa atau menggandakan data |
| Konfigurasi database | `MONGODB_URI` | `DATABASE_URL` untuk koneksi Supabase |
| Halaman Profil | Route awal `/about` | Tab Profil saat ini menggunakan route `/profile` |

Perubahan database dilakukan setelah keputusan proyek beralih dari MongoDB ke PostgreSQL. Kontrak dan tujuan REST API dipertahankan agar fitur frontend tetap dapat menggunakan operasi Biji Kopi, seduhan, favorit, pencarian, filter, pagination, dan statistik.

Data seed yang digunakan adalah **data contoh**, bukan ekspor riwayat database MongoDB lama. Karena itu, angka 17 Biji Kopi dan 50 seduhan menggambarkan dataset demonstrasi yang dimasukkan ke database Supabase.

## 8. PWA, Deployment, dan Konfigurasi

Frontend dibangun sebagai PWA dengan manifest dan service worker. Pengguna dapat memasangnya melalui browser yang mendukung instalasi PWA. Tampilan dirancang untuk layar ponsel dan memiliki navigasi bawah. Aplikasi memberi indikator ketika offline; fitur yang memerlukan penyimpanan tetap membutuhkan koneksi.

Frontend dan backend dipublikasikan melalui Vercel, sedangkan PostgreSQL berjalan pada Supabase. Koneksi database dikonfigurasi melalui environment variable `DATABASE_URL` di lingkungan server. Alamat frontend yang diizinkan backend dikonfigurasi melalui `CLIENT_ORIGIN`. Nilai konfigurasi sensitif disimpan di environment lokal/hosting dan tidak dicantumkan dalam dokumen ini.

## 9. Pengujian dan Validasi

Pengujian yang telah dijalankan mencakup:

- Tes endpoint backend untuk health check, operasi data utama, Arsip, pemulihan, penghapusan permanen, cascade Biji Kopi-Seduhan, dan validasi field.
- Tes frontend untuk logika kalkulator rasio dan timer.
- Build produksi frontend.
- Verifikasi aplikasi ter-deploy dapat menampilkan data, menambah seduhan, dan mempertahankan data setelah halaman dimuat ulang.

Pada rangkaian validasi yang tercatat selama pengembangan, tes backend dan frontend serta build frontend berhasil. Tes backend mencakup pemulihan selektif sehingga Seduhan yang diarsipkan sendiri tidak otomatis dipulihkan bersama Biji Kopi. Seed juga dirancang untuk memastikan data contoh hanya dimasukkan ketika basis data masih kosong.

## 10. Batasan yang Diketahui

- Aplikasi belum memiliki login maupun pemisahan data antar pengguna; seluruh data, termasuk Arsip, digunakan bersama.
- Penyimpanan data memerlukan koneksi internet; belum ada antrean sinkronisasi untuk operasi tulis ketika offline.
- Dataset seed merupakan data contoh, bukan migrasi riwayat pengguna dari MongoDB.
- Layanan hosting gratis dapat memiliki batas kuota, waktu respons awal, atau jeda layanan.

## 11. Kesimpulan

SeduhLog telah mengimplementasikan aplikasi jurnal penyeduhan kopi berbasis PWA, REST API buatan sendiri, dan PostgreSQL di Supabase. Fitur utama meliputi pengelolaan Biji Kopi dan seduhan, halaman detail, statistik, timer, kalkulator rasio, profil, dan instalasi PWA. Perubahan terbesar dari rancangan awal adalah penggunaan Supabase PostgreSQL sebagai pengganti MongoDB Atlas serta Vercel sebagai hosting backend, tanpa mengubah tujuan utama aplikasi.
