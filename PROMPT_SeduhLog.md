# PROMPT UNTUK AGENT: Bangun "SeduhLog" (PWA Jurnal Seduh Kopi dan Cupping Notes Pribadi)

Kamu adalah agent pengembang aplikasi senior. Bangun aplikasi lengkap, siap dijalankan, dan siap di-deploy sesuai spesifikasi di bawah. Ikuti dokumen ini secara literal. Jika ada hal yang tidak dijelaskan, ambil keputusan yang masuk akal dan sederhana, catat di README bagian "Keputusan Desain", dan jangan berhenti untuk bertanya. Semua teks antarmuka (UI) memakai **Bahasa Indonesia**. Nama variabel, kode, dan komentar memakai Bahasa Inggris.

---

## 1. Konteks

Ini adalah Tugas Akhir (TA) praktikum Pemrograman Perangkat Bergerak. Aturan TA yang WAJIB terpenuhi (jadi acceptance criteria utama):

1. Platform: **Progressive Web App (PWA)** yang bisa di-install dan berjalan baik di **Android (Chrome)** dan **iOS (Safari, Add to Home Screen)**.
2. Memakai **API / Web Service buatan sendiri** (backend REST sendiri, bukan API pihak ketiga).
3. Memiliki **Bottom Navigation Bar**.
4. Minimal **5 halaman** (halaman utama yang ada di bottom nav).
5. Minimal **2 halaman utama berisi list**, dan **setiap item list bisa diklik untuk membuka halaman detail**.
6. Ada **1 halaman Profil/About** aplikasi.
7. Source code diunggah ke **GitHub** (repo public; siapkan agar langsung bisa di-push).
8. PWA wajib di-deploy dengan **free hosting**.
9. Judul TA: **SeduhLog: PWA Jurnal Seduh Kopi dan Cupping Notes Pribadi**.

Konsep: aplikasi jurnal pribadi untuk mencatat setiap seduhan kopi (metode, rasio, suhu, grind, waktu, rasa) beserta catatan cupping, mengelola koleksi biji kopi, dan menyediakan timer seduh interaktif plus kalkulator rasio. Pengguna tunggal, tanpa login.

---

## 2. Tech stack (wajib, jangan diganti)

**Frontend** (`/client`)
- React 18 + Vite + JavaScript (bukan TypeScript)
- React Router v6
- TanStack Query v5 (data fetching + cache)
- Tailwind CSS v3 (bukan v4)
- `vite-plugin-pwa` (Workbox, `generateSW`) dan `@vite-pwa/assets-generator` untuk ikon
- `lucide-react` untuk ikon UI
- `@fontsource-variable/fraunces` (judul) dan `@fontsource-variable/inter` (isi), di-self-host supaya jalan offline
- Tanpa library chart; statistik pakai bar sederhana dari CSS/SVG

**Backend** (`/server`)
- Node.js 20+ + Express 4 (CommonJS atau ESM, pilih satu dan konsisten)
- MongoDB Atlas (free tier M0) lewat Mongoose
- `cors`, `helmet`, `morgan`, `dotenv`, `express-rate-limit`, `zod` (validasi)
- Tes: `vitest` + `supertest` (minimal smoke test endpoint utama)

**Deploy (free)**
- Frontend: Vercel (atau Netlify), siapkan `vercel.json` dengan SPA rewrite ke `index.html`
- Backend: Render free web service, siapkan `render.yaml`
- Database: MongoDB Atlas M0

Struktur repo (monorepo):

```
seduhlog/
  client/
  server/
  README.md
  .gitignore
  PROMPT_SeduhLog.md   (file ini, boleh disalin ke repo)
```

---

## 3. Model data

Gunakan Mongoose, `timestamps: true`. Respons API mengubah `_id` menjadi `id` dan menghapus `__v`.

### Bean (biji kopi)
| Field | Tipe | Aturan |
|---|---|---|
| name | String | wajib, 2-80 karakter |
| origin | String | wajib, mis. "Gayo, Aceh" |
| roaster | String | opsional |
| process | String enum | `washed`, `natural`, `honey`, `anaerobic`, `lainnya` |
| roastLevel | String enum | `light`, `medium`, `dark` |
| variety | String | opsional |
| altitudeMasl | Number | opsional, 0-3000 |
| roastDate | Date | opsional |
| flavorNotes | [String] | maks 8 item |
| imageUrl | String | opsional, harus URL http(s) valid; kalau kosong, UI tampilkan placeholder berbasis gradient + inisial |
| notes | String | opsional, maks 500 |

### Brew (seduhan)
| Field | Tipe | Aturan |
|---|---|---|
| bean | ObjectId ref Bean | wajib, harus ada |
| method | String enum | `v60`, `french_press`, `aeropress`, `espresso`, `tubruk`, `moka_pot`, `cold_brew` |
| doseGrams | Number | wajib, 5-100 |
| waterGrams | Number | wajib, 20-2000 |
| waterTempC | Number | opsional, 0-100 |
| grindSize | String enum | `extra_fine`, `fine`, `medium_fine`, `medium`, `medium_coarse`, `coarse` |
| grinderSetting | String | opsional, mis. "21 klik" |
| brewTimeSeconds | Number | opsional, 0-86400 |
| tdsPercent | Number | opsional, 0-20 |
| rating | Number int | wajib, 1-5 |
| cupping | Object | `aroma, flavor, acidity, body, sweetness, aftertaste, balance`, masing-masing integer 1-10, opsional semua |
| tasteTags | [String] | maks 8 |
| notes | String | opsional, maks 1000 |
| isFavorite | Boolean | default false |
| brewedAt | Date | default sekarang |

Virtual/computed di respons Brew:
- `ratio` = `waterGrams / doseGrams` dibulatkan 1 desimal (ditampilkan "1:16.0")
- `cuppingAverage` = rata-rata field cupping yang terisi, 1 desimal, atau `null`
- Saat list, sertakan ringkasan bean: `bean: { id, name, origin }` (populate).

---

## 4. REST API (prefix `/api`)

Format respons seragam:

```json
{ "success": true, "data": ..., "meta": { "page":1, "limit":10, "total":42, "totalPages":5 }, "message": "..." }
```
Error: `{ "success": false, "message": "...", "errors": [ { "field": "...", "message": "..." } ] }` dengan status code yang benar (400 validasi, 404 tidak ditemukan, 409 konflik, 429 rate limit, 500 server). Jangan pernah membocorkan stack trace di production.

| Method & path | Fungsi |
|---|---|
| `GET /api/health` | `{ status: "ok", uptime, time }` |
| `GET /api/beans` | list; query: `q` (cari name/origin/roaster, case-insensitive), `process`, `roastLevel`, `sort` (`newest`\|`name`), `page`, `limit` (default 10, maks 50) |
| `GET /api/beans/:id` | detail + `brewCount`, `avgRating`, dan 5 seduhan terbaru dengan biji ini |
| `POST /api/beans` | buat |
| `PUT /api/beans/:id` | ubah |
| `DELETE /api/beans/:id` | hapus; jika masih dipakai seduhan, balas **409** dengan pesan "Biji ini masih dipakai N seduhan" |
| `GET /api/brews` | list; query: `method`, `beanId`, `minRating`, `favorite=true`, `q` (cari di notes/tasteTags), `sort` (`newest`\|`oldest`\|`rating`), `page`, `limit` |
| `GET /api/brews/:id` | detail lengkap + bean lengkap |
| `POST /api/brews` | buat |
| `PUT /api/brews/:id` | ubah |
| `PATCH /api/brews/:id/favorite` | toggle favorit, balas objek brew terbaru |
| `DELETE /api/brews/:id` | hapus |
| `GET /api/stats` | `{ totalBrews, totalBeans, avgRating, favoriteMethod, topBean:{id,name,count}, brewsPerWeek:[{weekStart,count}] (8 minggu terakhir, urut lama ke baru, minggu kosong tetap muncul dengan count 0), methodBreakdown:[{method,count}] }` |
| `GET /api/methods` | preset metode untuk timer/kalkulator (lihat bagian 7), dilayani dari konstanta server |

Aturan backend:
- Validasi semua input dengan zod; validasi `ObjectId` pada `:id` (balas 400 jika format salah, 404 jika tidak ada).
- CORS hanya mengizinkan origin dari env `CLIENT_ORIGIN` (boleh daftar dipisah koma) dan `http://localhost:5173` saat development.
- `helmet`, `express-rate-limit` (mis. 200 req / 15 menit / IP), batas body JSON 100kb.
- Graceful startup: koneksi Mongo gagal -> log jelas dan exit code 1.
- Satu file `src/app.js` (export app, tanpa listen) dan `src/server.js` (listen) agar mudah dites.
- **Seed script** `npm run seed`: hapus data lama lalu isi 6 biji dan 15 seduhan realistis. Biji (nama dan asal nyata Indonesia): Gayo (Aceh), Toraja Sapan (Sulawesi Selatan), Kintamani (Bali), Flores Bajawa, Java Preanger, Wamena (Papua). Variasikan metode, rating, cupping, dan `brewedAt` tersebar dalam 8 minggu terakhir agar statistik tampak hidup.

---

## 5. Halaman dan navigasi frontend

Bottom navigation (fixed, 5 item, ikon + label, state aktif jelas, tinggi ~64px + safe-area):

| Tab | Route | Isi |
|---|---|---|
| Beranda | `/` | dashboard |
| Seduhan | `/brews` | **LIST #1** |
| Biji | `/beans` | **LIST #2** |
| Timer | `/timer` | timer + kalkulator |
| Profil | `/about` | profil dan tentang aplikasi |

Rute lain (bukan tab, bottom nav tetap tampil kecuali di form):
- `/brews/:id` detail seduhan (**detail dari LIST #1**)
- `/brews/new` dan `/brews/:id/edit` form seduhan
- `/beans/:id` detail biji (**detail dari LIST #2**)
- `/beans/new` dan `/beans/:id/edit` form biji
- `*` halaman 404 yang ramah

Halaman detail punya tombol kembali (header), aksi Ubah dan Hapus, dan transisi halus. Form menyembunyikan bottom nav dan memakai tombol Simpan sticky di bawah.

### 5.1 Beranda
- Sapaan singkat + tanggal hari ini.
- Kartu statistik 2x2: Total Seduhan, Rata-rata Rating, Metode Favorit, Biji Teratas (dari `/api/stats`).
- Grafik batang "Seduhan per minggu" (8 minggu) dari `brewsPerWeek`.
- "Seduhan Terbaru" (3 item, klik -> detail) dan tombol utama besar "Mulai Seduh" -> `/timer`.
- Empty state bila belum ada data: ilustrasi sederhana + ajakan "Catat seduhan pertamamu".

### 5.2 Seduhan (list)
- Search bar (`q`), chip filter metode (scroll horizontal), toggle "Favorit", dropdown urutan.
- Kartu item: nama biji, metode (badge), rasio "1:16", rating bintang, `cuppingAverage` jika ada, tanggal relatif ("2 hari lalu"), ikon hati favorit (bisa di-toggle tanpa membuka detail; optimistic update).
- Paginasi dengan tombol "Muat lebih banyak" (`useInfiniteQuery`).
- FAB "+" ke `/brews/new`.
- Klik kartu -> `/brews/:id`.

### 5.3 Detail Seduhan
- Header: nama biji + metode, rating, tombol favorit.
- Blok parameter: dosis, air, rasio, suhu, grind (+ setting), waktu (format mm:ss), TDS.
- Blok Cupping: **radar chart SVG buatan sendiri** (7 sumbu) atau bar horizontal bila lebih sederhana; tampilkan rata-rata.
- Tag rasa sebagai chip, catatan, tautan ke detail biji.
- Aksi: Ubah, Hapus (dialog konfirmasi), "Seduh Lagi" (buka `/timer` dengan parameter ini terisi).

### 5.4 Biji (list)
- Search, filter proses dan roast level, urutan.
- Kartu: gambar atau placeholder, nama, asal, badge proses dan roast, flavor notes (maks 3 chip + "+N"), jumlah seduhan.
- Klik -> `/beans/:id`. FAB "+" ke `/beans/new`.

### 5.5 Detail Biji
- Info lengkap, `brewCount`, `avgRating`, daftar "Seduhan dengan biji ini" (5 terbaru, klik -> detail seduhan), tombol "Seduh dengan biji ini" (`/brews/new?beanId=...`), Ubah, Hapus (tangani 409 dengan pesan jelas).

### 5.6 Timer (halaman utama ke-4)
Dua bagian dalam satu halaman, dipisah segmented control: **Timer** dan **Kalkulator**.

**Kalkulator rasio**: input dosis (g), air (g), rasio (1:X). Ubah salah satu, dua lainnya terhitung otomatis (mode kunci: "Hitung air dari dosis" / "Hitung dosis dari air"). Ada pilihan metode yang mengisi rasio dan suhu rekomendasi dari preset.

**Timer interaktif** (lihat spesifikasi di bagian 7).

### 5.7 Profil / Tentang
- Kartu pengembang: nama, NIM, program studi, universitas, tautan GitHub. Ambil dari satu file `client/src/config/profile.js` agar mudah diedit (isi: nama "Frans Suyitno Pastika Manurung", NIM "21120124140159", prodi "Teknik Komputer", universitas "Universitas Diponegoro", GitHub username "zhura24"; tandai di README agar pengguna memeriksa ulang).
- Tentang aplikasi: deskripsi, versi (`__APP_VERSION__` dari package.json lewat Vite define), daftar teknologi, mata kuliah/praktikum.
- Bagian "Pengaturan": toggle tema (Terang/Gelap/Ikuti sistem), tombol "Pasang Aplikasi" (lihat bagian 8), status koneksi (Online/Offline), tombol "Bersihkan cache data".
- Tautan ke repo GitHub aplikasi (isi dari konstanta).

---

## 6. Form

**Form Seduhan** (`/brews/new`, `/brews/:id/edit`):
- Pilih biji (select dengan pencarian ringan; jika `?beanId=` ada, terisi otomatis; sediakan tautan "Tambah biji baru").
- Pilih metode (segmented/grid ikon). Saat metode dipilih di form baru, isi default dari preset (rasio, suhu, grind) tetapi tetap bisa diubah.
- Dosis dan air dengan tampilan rasio langsung ("1:16.0").
- Suhu, grind (select), setting grinder, waktu seduh (input menit dan detik terpisah), TDS.
- Rating bintang (wajib).
- Cupping: 7 slider 1-10 dengan nilai terlihat, bisa dilewati lewat bagian yang bisa dilipat ("Catatan Cupping (opsional)").
- Tag rasa: input chip dengan saran cepat (Cokelat, Karamel, Buah beri, Jeruk, Floral, Kacang, Rempah, Manis madu, Earthy, Asam segar).
- Catatan, tanggal/jam seduh.
- Dukung prefill dari timer lewat `location.state` (method, doseGrams, waterGrams, waterTempC, brewTimeSeconds).
- Validasi sisi klien sama dengan server; tampilkan error per field dalam Bahasa Indonesia; tombol Simpan menampilkan loading dan mencegah double submit.
- Setelah sukses: invalidate query terkait, toast "Seduhan tersimpan", navigasi ke detail.

**Form Biji**: semua field model Bean; flavor notes sebagai chip; pratinjau gambar jika `imageUrl` valid.

---

## 7. Spesifikasi Timer dan preset metode

Preset (konstanta di server, endpoint `/api/methods`, dan salinan fallback di klien untuk offline):

| method | label | rasio | suhu °C | grind | langkah (persentase air, waktu kumulatif) |
|---|---|---|---|---|---|
| v60 | V60 | 1:16 | 94 | medium_fine | Bloom 15% 0:00-0:45; Tuang ke 60% 0:45-1:30; Tuang ke 100% 1:30-2:15; Tunggu turun 2:15-3:00 |
| french_press | French Press | 1:15 | 93 | coarse | Tuang semua air 0:00-0:30; Seduh 0:30-4:00; Tekan dan sajikan 4:00-4:30 |
| aeropress | AeroPress | 1:15 | 88 | medium_fine | Tuang semua air 0:00-0:20; Aduk dan seduh 0:20-1:30; Tekan pelan 1:30-2:00 |
| espresso | Espresso | 1:2 | 93 | fine | Ekstraksi 0:00-0:28 |
| tubruk | Kopi Tubruk | 1:12 | 95 | extra_fine | Tuang air 0:00-0:15; Diamkan agar ampas turun 0:15-4:00 |
| moka_pot | Moka Pot | 1:10 | 90 | medium_fine | Satu langkah stopwatch (tanpa langkah otomatis) |
| cold_brew | Cold Brew | 1:8 | 4 | coarse | Tidak ada timer langkah; tampilkan catatan "Seduh dingin 12-18 jam" dan nonaktifkan timer |

Perilaku timer:
- Pilih metode, dosis, dan rasio -> jumlah air total dan **target air kumulatif per langkah** dihitung dan ditampilkan ("Tuang sampai 90 g").
- Layar besar menampilkan waktu mm:ss, nama langkah aktif, target air, dan progress ring SVG. Langkah berikutnya tampil sebagai "Selanjutnya".
- Tombol: Mulai, Jeda, Lanjut, Reset, Lewati langkah.
- **Akurasi**: simpan `startTimestamp` dan akumulasi jeda, hitung `elapsed` dari `Date.now()` / `performance.now()` setiap tick (interval 200 ms atau `requestAnimationFrame`), JANGAN menjumlah tick; tetap akurat saat tab ke background.
- Pindah langkah memicu bunyi pendek (WebAudio, tanpa file audio eksternal) dan `navigator.vibrate` bila tersedia (abaikan di iOS tanpa error).
- Gunakan Screen Wake Lock API (`navigator.wakeLock.request('screen')`) saat timer berjalan, dengan feature detection dan pelepasan saat jeda atau selesai; render ulang lock saat `visibilitychange`.
- Saat selesai: tampilkan ringkasan dan tombol "Simpan sebagai seduhan" -> `/brews/new` dengan prefill (method, dosis, air, suhu, waktu aktual dalam detik).
- Timer berjalan di sisi klien saja; semua logika timer harus berupa fungsi/hook murni yang bisa dites (`useBrewTimer`).

---

## 8. Persyaratan PWA (kritis, harus berfungsi di Android dan iOS)

- **Manifest** (lewat vite-plugin-pwa): `name: "SeduhLog"`, `short_name: "SeduhLog"`, `description`, `lang: "id"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `orientation: "portrait"`, `background_color` dan `theme_color` sesuai palet, ikon 192, 512, dan 512 maskable. Tambahkan `shortcuts` (Mulai Timer -> `/timer`, Tambah Seduhan -> `/brews/new`).
- **Ikon**: buat `client/public/logo.svg` (cangkir kopi + uap minimalis, warna palet) lalu hasilkan semua ikon dengan `@vite-pwa/assets-generator` (pwa-64, 192, 512, maskable-512, `apple-touch-icon` 180, `favicon.ico`). Sertakan konfigurasi `pwa-assets.config.js` dan skrip `npm run generate-pwa-assets`; commit hasilnya.
- **Tag iOS** di `index.html`: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` (`black-translucent`), `apple-mobile-web-app-title`, `<link rel="apple-touch-icon">`, dan `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- **Safe area**: header dan bottom nav memakai `env(safe-area-inset-top/bottom)`; tidak ada elemen yang tertutup notch atau home indicator. Gunakan `100dvh`, bukan `100vh`.
- **Service worker** (Workbox lewat `generateSW`, `registerType: "prompt"`):
  - Precache seluruh app shell (JS, CSS, font, ikon, `index.html`) dengan `navigateFallback: "/index.html"`.
  - Runtime caching untuk `GET /api/*` dengan `NetworkFirst` (timeout 4 detik, cache `seduhlog-api`, maks 100 entri, 7 hari), kecuali `/api/health`.
  - Gambar eksternal `imageUrl`: `StaleWhileRevalidate`, cache terpisah, maks 60 entri.
  - Tampilkan banner "Versi baru tersedia, Muat ulang" saat SW baru menunggu.
- **Offline**: halaman yang pernah dibuka tetap tampil dari cache; saat offline tampilkan indikator "Mode offline" (dari `navigator.onLine` + event online/offline). Aksi tulis (POST/PUT/DELETE/PATCH) saat offline ditolak dengan toast jelas "Tidak bisa menyimpan saat offline" dan data form tidak hilang. Timer dan kalkulator harus berfungsi penuh offline.
- **Install prompt**:
  - Android/Chromium: tangkap `beforeinstallprompt`, tampilkan tombol "Pasang Aplikasi" di halaman Profil dan banner ringan di Beranda (dapat ditutup; ingat penutupan di `localStorage`).
  - iOS Safari (deteksi UA iOS dan bukan standalone): tampilkan bottom sheet petunjuk "Ketuk ikon Bagikan, lalu pilih Tambah ke Layar Utama" dengan ilustrasi ikon sederhana.
  - Sembunyikan semua prompt bila sudah berjalan standalone (`display-mode: standalone` atau `navigator.standalone`).
- Target Lighthouse (mobile): PWA installable lolos, Performance >= 85, Accessibility >= 90, Best Practices >= 90.

---

## 9. Desain UI/UX

Mobile-first (target 360-430 px), konten di tengah dengan `max-width: 480px` pada layar lebar. Nuansa: hangat, bersih, premium seperti kedai kopi spesialti. Hindari tampilan template generik.

**Token warna (Tailwind `theme.extend.colors`, dengan CSS variables agar mode gelap mudah)**

| Token | Terang | Gelap |
|---|---|---|
| background | `#FAF6F0` | `#17110D` |
| surface | `#FFFFFF` | `#231A14` |
| surface-alt | `#F2EAE0` | `#2D221A` |
| text | `#2B1D16` | `#F3EAE0` |
| text-muted | `#7A6658` | `#B9A794` |
| primary (espresso) | `#6F4E37` | `#C9A27E` |
| accent (karamel) | `#C8873A` | `#E0A458` |
| success | `#4F7A4A` | `#7FB077` |
| danger | `#B3402F` | `#E0705F` |
| border | `#E6DACB` | `#3A2C22` |

Tipografi: judul/angka besar Fraunces, isi Inter. Radius kartu 16 px, bayangan lembut, jarak lega. Target sentuh minimal 44x44 px. Kontras teks memenuhi WCAG AA. Hormati `prefers-reduced-motion`.

Komponen bersama yang wajib ada: `BottomNav`, `PageHeader`, `Card`, `Badge`, `Chip`, `StarRating`, `RatingSlider`, `SegmentedControl`, `Skeleton`, `EmptyState`, `ErrorState` (dengan tombol "Coba lagi"), `Toast`, `ConfirmDialog`, `Fab`, `BarChart`, `RadarChart`.

Wajib untuk semua layar data: state **loading (skeleton)**, **kosong**, **error**, dan **sukses**.

**Cold start Render**: backend free tier bisa tidur dan butuh 30-60 detik untuk bangun. Klien harus menampilkan skeleton dan, jika permintaan melebihi 6 detik, pesan "Server sedang bangun, mohon tunggu sebentar..." dengan retry otomatis (TanStack Query `retry: 3` dengan backoff). Tambahkan ping `/api/health` ringan saat aplikasi dibuka untuk membangunkan server lebih awal.

---

## 10. Konfigurasi dan environment

`server/.env.example`
```
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/seduhlog?retryWrites=true&w=majority
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```
`client/.env.example`
```
VITE_API_BASE_URL=http://localhost:5000/api
```

Jangan pernah commit `.env`. `.gitignore` mencakup `node_modules`, `dist`, `.env*` (kecuali `.example`), `.DS_Store`. Semua panggilan API klien lewat satu modul `src/lib/api.js` (fetch wrapper: base URL, header JSON, timeout 15 detik via `AbortController`, parsing error seragam menjadi `ApiError`).

Skrip npm:
- server: `dev` (nodemon atau `node --watch`), `start`, `seed`, `test`
- client: `dev`, `build`, `preview`, `generate-pwa-assets`, `test`

Siapkan `render.yaml` (service web, root dir `server`, build `npm install`, start `npm start`, env var dideklarasikan tanpa nilai rahasia, `healthCheckPath: /api/health`) dan `client/vercel.json` (rewrite semua path non-file ke `/index.html`).

---

## 11. Kualitas kode

- Struktur server: `src/{config,models,routes,controllers,middleware,validators,data}`; controller tipis, error ditangani oleh satu error-handling middleware, bungkus handler async dengan helper.
- Struktur klien: `src/{components,pages,hooks,lib,config,styles}`; pisahkan hook query per resource (`useBrews`, `useBeans`, `useStats`).
- Query key konsisten; invalidasi tepat setelah mutasi; optimistic update untuk toggle favorit dengan rollback saat gagal.
- Tidak ada `console.log` sisa debug, tidak ada kode mati, tidak ada rahasia hard-coded.
- Aksesibilitas: elemen semantik, `aria-label` pada tombol ikon, `aria-current="page"` pada tab aktif, fokus terlihat, label pada semua input.
- Tes minimal: server (health, CRUD beans, CRUD brews, validasi gagal 400, 404, 409 hapus biji terpakai, stats), klien (logika kalkulator rasio dan `useBrewTimer` termasuk jeda/lanjut).

---

## 12. README.md (Bahasa Indonesia, wajib lengkap)

Isi: deskripsi singkat dan judul TA, fitur, tangkapan layar (placeholder bagian untuk diisi), arsitektur singkat, daftar endpoint, cara menjalankan lokal (langkah demi langkah termasuk setup MongoDB Atlas M0: buat cluster, buat user DB, izinkan IP `0.0.0.0/0`, salin connection string), cara seed, cara tes, **panduan deploy** (Atlas -> Render -> Vercel, urutan benar, dan cara mengisi `CLIENT_ORIGIN` dan `VITE_API_BASE_URL` setelah URL produksi diketahui), cara memasang di Android dan iOS, "Keputusan Desain", dan keterbatasan yang diketahui.

---

## 13. Alur kerja yang harus kamu ikuti

1. Tulis rencana singkat (struktur folder dan urutan kerja), lalu langsung eksekusi tanpa menunggu konfirmasi.
2. Bangun **server** dulu: model, validasi, route, seed, tes. Jalankan dan uji dengan `curl` (atau supertest) sampai semua endpoint benar. Jika Atlas tidak tersedia di lingkungan kerjamu, gunakan `mongodb-memory-server` hanya untuk tes dan tetap tulis kode untuk Atlas.
3. Bangun **client**: konfigurasi (Tailwind, PWA, ikon), komponen bersama, lalu halaman satu per satu sesuai bagian 5, dari Beranda hingga Profil.
4. Jalankan `npm run build` di client dan perbaiki semua error dan warning. Jalankan `npm run preview` dan verifikasi: manifest valid, service worker terdaftar, aplikasi bisa dibuka offline setelah kunjungan pertama.
5. Jalankan semua tes sampai hijau.
6. Lakukan **self-review** terhadap checklist di bawah dan perbaiki yang belum terpenuhi.
7. Inisialisasi git dengan commit bertahap yang bermakna (Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`), tetapi jangan melakukan push (pengguna akan melakukannya sendiri).
8. Laporan akhir singkat: apa yang dibangun, cara menjalankan (perintah persis), hal yang harus dilakukan pengguna secara manual (membuat akun Atlas/Render/Vercel, mengisi env, memeriksa data profil), dan keterbatasan.

---

## 14. Checklist penerimaan (semua harus tercentang sebelum selesai)

**Aturan TA**
- [ ] PWA bisa di-install di Android Chrome dan iOS Safari (manifest, ikon, tag iOS, SW)
- [ ] Memakai API Express buatan sendiri (bukan API pihak ketiga)
- [ ] Bottom Navigation Bar dengan 5 tab
- [ ] Minimal 5 halaman utama (Beranda, Seduhan, Biji, Timer, Profil)
- [ ] 2 halaman list (Seduhan, Biji) dan setiap item membuka halaman detail
- [ ] Halaman Profil/About lengkap
- [ ] Repo siap GitHub (README, .gitignore, tanpa rahasia)
- [ ] Siap free hosting (Vercel, Render, Atlas) dengan `vercel.json` dan `render.yaml`
- [ ] Judul aplikasi dan About memakai: "SeduhLog: PWA Jurnal Seduh Kopi dan Cupping Notes Pribadi"

**Fungsional**
- [ ] CRUD Biji dan Seduhan berjalan penuh, termasuk validasi dan pesan error Indonesia
- [ ] Hapus biji yang dipakai seduhan -> 409 dan pesan jelas di UI
- [ ] Favorit (optimistic), filter, pencarian, urutan, dan "Muat lebih banyak" bekerja
- [ ] Statistik Beranda akurat dan sesuai data
- [ ] Timer akurat (tahan tab background), jeda/lanjut, langkah otomatis, bunyi, wake lock, prefill ke form
- [ ] Kalkulator rasio dua arah akurat
- [ ] Mode gelap dan terang, toggle tema tersimpan

**PWA dan kualitas**
- [ ] Offline: shell, halaman yang sudah dikunjungi, timer, dan kalkulator berfungsi
- [ ] Banner update SW, banner install Android, petunjuk install iOS
- [ ] Safe area benar di perangkat bertakik, tanpa scroll horizontal
- [ ] Setiap layar punya state loading, kosong, error, dan sukses
- [ ] Penanganan cold start Render
- [ ] Build produksi bersih, tes hijau, tanpa `console.log` debug
- [ ] Lighthouse mobile sesuai target bagian 8

---

## 15. Di luar cakupan (jangan dikerjakan)

Autentikasi/login, multi-user, pembayaran, push notification server, upload file gambar (cukup `imageUrl`), dan library UI berat (MUI, Ant Design, dll.).
