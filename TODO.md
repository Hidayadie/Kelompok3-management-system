# 📋 TODO & Codebase Review — Sistem Manajemen Aset & Komplain

Dokumen ini memuat hasil audit komprehensif seluruh codebase (Backend Go & Frontend Web) serta daftar pekerjaan (**TODO**) yang perlu diselesaikan. Fokus utama mencakup endpoint yang belum tersedia, ketidaksambungan antara Backend dan Frontend, perbaikan bug logika/skema database, serta fitur-fitur yang masih berupa *mockup* statis.

---

## 📑 Daftar Isi
1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Temuan Kritis & Bug Utama](#2-temuan-kritis--bug-utama)
3. [Audit & Analisis Modul Backend (Go / Gin / Gorm)](#3-audit--analisis-modul-backend)
4. [Audit & Analisis Frontend (HTML / JavaScript / Bootstrap)](#4-audit--analisis-frontend)
5. [Konektivitas API (Backend vs Frontend)](#5-konektivitas-api-backend-vs-frontend)
6. [Daftar Rencana Aksi (Actionable TODO Checklist)](#6-daftar-rencana-aksi-actionable-todo-checklist)

---

## 1. Ringkasan Eksekutif

| Komponen | Status Saat Ini | Keterangan |
| :--- | :--- | :--- |
| **Autentikasi (Login/Logout/Me)** | 🟡 Sebagian Berjalan | Login & session cookie berjalan. Register frontend belum memanggil API backend. |
| **Manajemen Pengguna (Users CRUD)** | 🔴 Belum Ada | Backend belum memiliki endpoint list/edit/delete user. Frontend `pengguna.html` belum ada. |
| **Kategori (`/categories`)** | 🟢 Berjalan | CRUD backend & frontend sudah terhubung via AJAX. |
| **Lokasi (`/location`)** | 🟢 Berjalan | CRUD backend & frontend sudah terhubung via AJAX. |
| **Aset Dasar (`/assets`)** | 🟡 Berjalan Parsial | CRUD dasar aktif, namun model Go memiliki kesalahan tipe data (`CreatedAt bool`), dan relasi status peminjaman belum ada. |
| **Aset Rusak** | 🔴 Belum Terhubung | Belum ada filter/endpoint khusus aset rusak (`condition = 'rusak'`) dan belum ada halaman frontend. |
| **Peminjaman / Aset Dipinjam** | 🔴 Belum Ada | Belum ada skema DB, model, handler, maupun halaman untuk fitur peminjaman aset. |
| **Komplain / Keluhan (`/complaints`)** | 🟡 Backend Saja | Backend memiliki CRUD keluhan, namun frontend sama sekali belum memiliki halaman/AJAX keluhan. |
| **Dashboard Admin** | 🔴 Statis / Error | Tampilan frontend masih berupa HTML statis. Route backend memiliki typo (`/dashboard/sumamary`) dan query SQL bermasalah. |
| **Dashboard User & Teknisi** | 🔴 Mockup Kasar | File duplikat dari admin dashboard, sidebar dan link masih mengarah ke halaman yang tidak ada (404). |

---

## 2. Temuan Kritis & Bug Utama

### 🚨 2.1 Bug Model Aset Go (`2-auth/internal/asset/model.go`)
- **Field `CreatedAt` bertipe `bool`:**
  ```go
  // KONDISI SAAT INI (SALAH):
  CreatedAt bool `json:"create_at" gorm:"column:update_at;autoUpdateTime"`
  ```
  Field `CreatedAt` didefinisikan sebagai `bool` dan diarahkan ke kolom `update_at` dengan `autoUpdateTime`.
  - **Dampak:** GORM salah memetakan kolom saat migrasi dan query data.
  - **Solusi yang diperlukan:** Ubah menjadi:
    ```go
    CreatedAt time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`
    ```

### 🚨 2.2 Typo Route & Crash Query Dashboard (`2-auth/internal/dashboard/`)
1. **Typo URL Endpoint:**
   - Di `2-auth/internal/dashboard/routes.go`:
     ```go
     group.GET("/dashboard/sumamary", ...) // Kelebihan huruf 'a'
     ```
     Harus diperbaiki menjadi `/dashboard/summary`.
2. **Crash Query PostgreSQL pada Kolom Boolean:**
   - Di `2-auth/internal/dashboard/repository.go`:
     ```go
     r.db.Table("assets").Where("LOWER(status) = ?", "tersedia").Count(...)
     r.db.Table("assets").Where("LOWER(status) = ?", "dipinjam").Count(...)
     ```
     Di `Asset`, field `Status` bertipe `bool`. Di PostgreSQL, menjalankan fungsi `LOWER(status)` pada kolom bertipe boolean akan menghasilkan error fatal: `function lower(boolean) does not exist`.
3. **Query Kolom `created_at`:**
   - Query `RecentAssets` memilih kolom `a.created_at`, padahal kolom tersebut berpotensi tidak terbentuk atau rusak akibat kesalahan pada struct `Asset`.

### 🚨 2.3 Form Register Frontend Tidak Memanggil Backend (`1-frontend/register.html`)
- Pada baris 241–249 `register.html`, fungsi `submit` hanya menampilkan `Swal.fire` statis:
  ```javascript
  /*
   * Hubungkan ke endpoint registrasi backend Go di sini.
   * Endpoint dan format JSON perlu disesuaikan dengan API kamu.
   */
  Swal.fire({
      icon: "info",
      title: "Form Registrasi Siap",
      text: "Hubungkan form ini ke endpoint registrasi akun pada backend Go."
  });
  ```
- Form tidak pernah mengirimkan HTTP POST ke `http://localhost:8080/api/auth/register`.

### 🚨 2.4 Kerentanan IDOR pada Complaint (`2-auth/internal/complaint/`)
- Pada `CreateComplaintRequest`, `UserID` diambil langsung dari JSON body (`req.UserID`), bukan dari context token JWT (`c.MustGet("user")`).
- Hal ini memungkinkan user biasa membuat komplain atas nama pengguna lain.
- Logika validasi `Update`: `Status` dibatasi hanya `low, medium, high, critical`, namun baris 127 menyetel `c.Status = "resolved"` saat `is_fixed = true`. Akibatnya, keluhan yang sudah *resolved* tidak dapat diupdate lagi karena gagal validasi enum status.

---

## 3. Audit & Analisis Modul Backend

### 3.1 Modul Auth & Users
- [x] Login (`POST /api/auth/login`) berfungsi dan menyetel cookie HttpOnly `access_token`.
- [x] Logout (`POST /api/auth/logout`) berfungsi menghapus cookie.
- [x] Current User (`GET /api/me`) berfungsi mengembalikan data profil pengguna saat ini.
- [x] Register (`POST /api/auth/register`) tersedia di backend dan memvalidasi `role (admin, teknisi, user)`.
- [ ] **Kekurangan:** Tidak ada endpoint CRUD User untuk Administrator (`GET /api/private/users`, `PUT /api/private/users/:id`, `DELETE /api/private/users/:id`).
- [ ] **Kekurangan RBAC:** Route privat (`/api/private/*`) hanya dicek apakah user sudah login (`requireAuth`), tetapi **belum diproteksi per-role**. User biasa (`role: user`) saat ini dapat memanggil endpoint hapus aset atau ubah kategori jika menembak API langsung.

### 3.2 Modul Aset (`/api/private/assets`)
- [x] CRUD standar (Create, Read List, Read Detail, Update, Soft-delete) sudah ada.
- [ ] **Kekurangan Filter Kondisi (Aset Rusak):** Handler `List` belum mendukung filter query parameter seperti `GET /api/private/assets?condition=rusak` atau endpoint khusus `GET /api/private/assets/damaged`.
- [ ] **Status Aset vs Status Peminjaman:** Kolom `status` saat ini bertipe `bool` (Aktif/Tidak Aktif). Tidak ada pelacakan status operasional seperti `"Tersedia"`, `"Dipinjam"`, atau `"Dalam Perbaikan"`.
- [ ] **Inkonsistensi Nilai Kondisi:**
  - Database & Handler: enum string (`Baik`, `Rusak Ringan`, `Rusak Berat`).
  - Dashboard Repository: mengecek `"baik"`, `"service"`, `"rusak"`. Terdapat ketidakcocokan definisi kondisi.

### 3.3 Modul Peminjaman (Borrowing / Loan System)
- [ ] **Sama sekali belum diimplementasikan di backend:**
  - Belum ada tabel database `loans` atau `asset_borrowings`.
  - Belum ada model struct Go untuk peminjaman aset (UserID, AssetID, BorrowDate, ExpectedReturnDate, ActualReturnDate, Status: `borrowed/returned/overdue`).
  - Belum ada service dan handler untuk `POST /api/private/loans`, `GET /api/private/loans`, `PUT /api/private/loans/:id/return`.
  - Belum ada endpoint untuk melihat aset yang sedang dipinjam (`GET /api/private/assets/borrowed`).

### 3.4 Modul Keluhan / Komplain (`/api/private/complaints`)
- [x] Model, repository, service, handler, dan routes sudah tersedia.
- [ ] `UserID` harus diambil otomatis dari JWT Claims, bukan input client.
- [ ] Model `Complaint` belum melakukan `Preload("User")` dan `Preload("Asset")` sehingga data respon API hanya memuat ID angka/UUID tanpa nama pembuat dan nama aset.
- [ ] Perlu pemisahan yang jelas antara `Severity/Priority` (`low`, `medium`, `high`, `critical`) dengan `Progress Status` (`pending`, `in_progress`, `resolved`, `closed`).

### 3.5 Modul Dashboard (`/api/private/dashboard`)
- [ ] Typo route `/dashboard/sumamary` harus diperbaiki ke `/dashboard/summary`.
- [ ] Perbaikan kueri agregasi agar kompatibel dengan PostgreSQL tanpa error tipe data boolean.
- [ ] Sinkronisasi data kartu ringkasan:
  - Total Aset
  - Aset Tersedia
  - Aset Dipinjam (butuh tabel peminjaman atau penyesuaian status)
  - Perlu Perbaikan (Aset dengan kondisi Rusak Ringan / Rusak Berat)

---

## 4. Audit & Analisis Frontend

### 4.1 Registrasi (`1-frontend/register.html`)
- [ ] Tambahkan handler AJAX fetch ke `http://localhost:8080/api/auth/register`.
- [ ] Format payload request yang dikirim:
  ```json
  {
    "name": "...",
    "email": "...",
    "password": "...",
    "role": "admin" | "teknisi" | "user"
  }
  ```
- [ ] Tambahkan penanganan pesan error dari backend (misal: "Email sudah terdaftar", validasi password < 8 karakter).
- [ ] Redirect pengguna ke `login.html` setelah registrasi berhasil.

### 4.2 Dashboard Admin (`1-frontend/client/admin/dashboard.html`)
- [ ] **Tombol "Lihat Semua" (View All):**
  - Baris 397: Link tertulis `<a href="aset.html">Lihat Semua</a>` (Error 404). Harus diubah mengarah ke `assets.html`.
  - Baris 528: Tombol Tambah Aset Baru tertulis `href="aset.html"`. Harus diubah ke `assets.html`.
- [ ] **Statistik & Tabel Masih Hardcoded:**
  - Angka 248, 186, 42, 20 adalah angka statis.
  - Tabel "Inventaris Terbaru" menampilkan 4 baris data palsu (Laptop Lenovo, Printer Epson, dll).
  - Progress bar kondisi inventaris masih statis.
- [ ] **Belum Ada Skrip AJAX Dashboard:**
  - Belum ada file `dashboard.js` yang memanggil `GET http://localhost:8080/api/private/dashboard/summary`.
- [ ] **Tautan Rusak (Broken Links) ke Halaman yang Belum Dibuat:**
  - `keluhan.html` (Baris 534) -> File belum ada.
  - `peminjaman.html` (Baris 540) -> File belum ada.
  - `pengguna.html` (Baris 546) -> File belum ada.
  - `laporan.html` (Baris 475) -> File belum ada.

### 4.3 Sidebar Bersama (`1-frontend/client/components/sidebar.html`)
- [ ] Menu `Kelola Keluhan` masih menggunakan `href="#"`.
- [ ] Menu `Kelola Aset Rusak` masih menggunakan `href="#"`.
- [ ] Menu `Manajemen Pengguna` mengarah ke `pengguna.html` (belum ada file).
- [ ] Menu `Laporan` mengarah ke `laporan.html` (belum ada file).
- [ ] Menu `Pengaturan` mengarah ke `pengaturan.html` (belum ada file).
- [ ] Sidebar saat ini berlabel statis "Admin Panel"; belum adaptif jika dibuka oleh User atau Teknisi.

### 4.4 Halaman Khusus Aset Rusak & Filter Kondisi
- [ ] Belum ada halaman `damaged-assets.html` (atau opsi filter cepat pada `assets.html`) untuk melihat dan memproses aset rusak.
- [ ] Pada `1-frontend/client/admin/assets.html`:
  - Belum ada filter dropdown berdasarkan **Kondisi** (Baik / Rusak Ringan / Rusak Berat). Filter yang tersedia saat ini hanya berdasarkan ID/Nama aset.

### 4.5 Dashboard User & Dashboard Teknisi
- [ ] `1-frontend/client/user/dashboard.html`:
  - Judul halaman masih `Dashboard Admin - Inventaris Cerdas`.
  - Sidebar di-hardcode secara inline, tidak menggunakan `layout.js` / `sidebar.html`.
  - Tidak memiliki fitur user seperti: Form Buat Keluhan, Daftar Riwayat Keluhan Saya, Permohonan Peminjaman Aset.
- [ ] `1-frontend/client/teknisi/dashboard.html`:
  - Judul halaman masih `Dashboard Admin - Inventaris Cerdas`.
  - Sidebar di-hardcode secara inline.
  - Tidak memiliki fitur teknisi seperti: Daftar Tiket Masuk yang Harus Diperbaiki, Tombol Update Status Perbaikan, Update Kondisi Aset pasca perbaikan.

### 4.6 File Sisa / Legacy yang Tidak Digunakan
- [ ] `1-frontend/check.cjs`: Script test node untuk pemesanan kopi/teh (projek lain).
- [ ] `1-frontend/legacy_order_index.html`: Sisa template toko/order produk.
- [ ] `1-frontend/contoh.html`: File contoh Bootstrap kosong.
- [ ] `1-frontend/client/admin/categoryOLD.html`: File cadangan kategori lama.

---

## 5. Konektivitas API (Backend vs Frontend)

Berikut adalah matriks kesiapan endpoint backend dan integrasi frontend:

| Fitur | Method | Endpoint Backend | Status Backend | Status Frontend | Keterangan |
| :--- | :---: | :--- | :---: | :---: | :--- |
| **Register Akun** | `POST` | `/api/auth/register` | ✅ Ready | ❌ Disconnected | Form frontend belum panggil fetch |
| **Login Akun** | `POST` | `/api/auth/login` | ✅ Ready | ✅ Connected | Sudah terhubung dan simpan cookie |
| **Cek Sesi User** | `GET` | `/api/me` | ✅ Ready | ✅ Connected | Digunakan di login & route guard |
| **Logout** | `POST` | `/api/auth/logout` | ✅ Ready | ✅ Connected | Terhubung di `layout.js` |
| **Summary Dashboard** | `GET` | `/api/private/dashboard/summary` | ⚠️ Bug Route/SQL | ❌ Disconnected | Typo `/sumamary`, frontend belum panggil |
| **List Aset** | `GET` | `/api/private/assets` | ✅ Ready | ✅ Connected | Terhubung di `asset.js` |
| **Filter Aset Rusak** | `GET` | `/api/private/assets?condition=rusak` | ❌ Belum Ada | ❌ Disconnected | Butuh penambahan filter query di backend |
| **Aset Dipinjam** | `GET` | `/api/private/assets/borrowed` | ❌ Belum Ada | ❌ Disconnected | Modul peminjaman belum dibuat |
| **Transaksi Pinjam** | `POST` | `/api/private/loans` | ❌ Belum Ada | ❌ Disconnected | Belum ada model/endpoint |
| **Kembalikan Aset** | `PUT` | `/api/private/loans/:id/return` | ❌ Belum Ada | ❌ Disconnected | Belum ada model/endpoint |
| **List Keluhan** | `GET` | `/api/private/complaints` | ✅ Ready | ❌ Disconnected | Halaman frontend keluhan belum dibuat |
| **Buat Keluhan** | `POST` | `/api/private/complaints` | ⚠️ IDOR Bug | ❌ Disconnected | Perlu ambil UserID dari JWT |
| **Kategori (CRUD)** | ALL | `/api/private/categories` | ✅ Ready | ✅ Connected | Berjalan dengan baik di `category.js` |
| **Lokasi (CRUD)** | ALL | `/api/private/location` | ✅ Ready | ✅ Connected | Berjalan dengan baik di `location.js` |
| **Manajemen User** | ALL | `/api/private/users` | ❌ Belum Ada | ❌ Disconnected | Endpoint CRUD user belum ada di backend |

---

## 6. Daftar Rencana Aksi (Actionable TODO Checklist)

### 🔴 Tahap 1: Perbaikan Bug Kritis (High Priority)
- [ ] **Fix Model Asset Go (`2-auth/internal/asset/model.go`):**
  - Ganti `CreatedAt bool` menjadi `CreatedAt time.Time`.
  - Perbaiki gorm tag menjadi `gorm:"column:created_at;autoCreateTime"`.
- [ ] **Fix Route & Query Dashboard:**
  - Ubah `/dashboard/sumamary` menjadi `/dashboard/summary` di `dashboard/routes.go`.
  - Perbaiki query `dashboard/repository.go` agar tidak memanggil `LOWER(status)` pada kolom boolean.
  - Pastikan query `RecentAssets` membaca kolom yang valid (`created_at`).
- [ ] **Koneksikan Form Registrasi (`1-frontend/register.html`):**
  - Buat fetch request ke `POST http://localhost:8080/api/auth/register`.
  - Berikan feedback validasi dan redirect otomatis ke `login.html`.
- [ ] **Perbaiki Link "Lihat Semua" & Tautan Rusak di Dashboard (`admin/dashboard.html`):**
  - Ganti seluruh referensi `aset.html` menjadi `assets.html`.
- [ ] **Perbaiki Keamanan Complaint (`2-auth/internal/complaint/`):**
  - Ambil `UserID` dari token auth (`c.MustGet("user")`), hapus `UserID` dari input form client.
  - Perbaiki validasi status agar mengizinkan update keluhan yang berstatus `resolved` atau `in_progress`.

---

### 🟡 Tahap 2: Fitur Aset Rusak & Dashboard Dinamis (Medium Priority)
- [ ] **Endpoint & Filter Aset Rusak:**
  - Tambahkan fitur filtering query pada `GET /api/private/assets` (misal: `?condition=rusak` atau `?condition=damaged`).
  - Tambahkan dropdown filter kondisi pada `1-frontend/client/admin/assets.html` (Semua / Baik / Rusak Ringan / Rusak Berat).
  - Buat halaman khusus `damaged-assets.html` atau sambungkan menu sidebar `Kelola Aset Rusak` ke filter aset rusak di tabel aset.
- [ ] **Integrasi Data Dinamis Dashboard Admin:**
  - Buat skrip AJAX `dashboard.js` untuk memanggil `GET /api/private/dashboard/summary`.
  - Render angka kartu ringkasan secara dinamis (Total Aset, Tersedia, Rusak/Perlu Perbaikan).
  - Render 5 data terakhir pada tabel "Inventaris Terbaru" dari database.
  - Render bar persentase kondisi aset berdasarkan data riil.

---

### 🟡 Tahap 3: Modul Peminjaman Aset (Medium Priority)
- [ ] **Backend Sistem Peminjaman:**
  - Buat tabel/model `Loan` (ID, UserID, AssetID, LoanDate, ReturnDate, Status: `dipinjam`, `dikembalikan`, `terlambat`, Notes).
  - Tambahkan AutoMigrate `&loan.Loan{}` di `main.go`.
  - Buat `Repository`, `Service`, `Handler`, dan daftarkan route:
    - `POST /api/private/loans` (Pinjam aset)
    - `GET /api/private/loans` (Daftar peminjaman aktif & riwayat)
    - `PUT /api/private/loans/:id/return` (Pengembalian aset)
    - `GET /api/private/assets/borrowed` (Daftar aset yang statusnya sedang dipinjam)
  - Otomatisasikan perubahan status ketersediaan aset saat dipinjam dan dikembalikan.
- [ ] **Frontend Halaman Peminjaman:**
  - Buat halaman `peminjaman.html` untuk admin mengelola peminjaman dan pengembalian aset.
  - Sambungkan tautan di sidebar admin dan menu akses cepat.

---

### 🟢 Tahap 4: Antarmuka Komplain & Manajemen Pengguna (Normal Priority)
- [ ] **Frontend Modul Keluhan (`keluhan.html`):**
  - Buat halaman `keluhan.html` lengkap dengan tabel riwayat keluhan, modal detail, dan modal tambah keluhan.
  - Sambungkan ke endpoint `/api/private/complaints` yang sudah ada di backend.
  - Tautkan menu `Kelola Keluhan` di `components/sidebar.html` ke `keluhan.html`.
- [ ] **Modul Pengguna (Users Management):**
  - Backend: Buat route dan handler `GET /api/private/users`, `PUT /api/private/users/:id/role`, `DELETE /api/private/users/:id`.
  - Frontend: Buat halaman `pengguna.html` untuk manajemen akun dan role pengguna oleh admin.

---

### 🟢 Tahap 5: Diferensiasi Role & Pembersihan Kode (Polish & Cleanup)
- [ ] **Proteksi Role di Backend (RBAC Middleware):**
  - Pasang middleware `RequireRole("admin")` pada operasi mutasi aset, kategori, lokasi, dan pengguna.
  - Izinkan role `teknisi` untuk mengubah status komplain dan kondisi perbaikan aset.
  - Izinkan role `user` hanya untuk membaca aset, mengajukan peminjaman, dan membuat keluhan miliknya.
- [ ] **Diferensiasi Dashboard User & Teknisi:**
  - Perbaiki `client/user/dashboard.html`: gunakan sidebar khusus user, tampilkan ringkasan keluhan dan peminjaman milik user.
  - Perbaiki `client/teknisi/dashboard.html`: gunakan sidebar khusus teknisi, tampilkan daftar tiket keluhan aset rusak yang perlu diperbaiki.
- [ ] **Pembersihan File Sampah (Cleanup):**
  - Hapus file sisa eksperimen: `check.cjs`, `legacy_order_index.html`, `contoh.html`, `client/admin/categoryOLD.html`.
- [ ] **Standardisasi Endpoint URL:**
  - Konsistensikan URL resource, contoh: `/api/private/location` (singular) menjadi `/api/private/locations` (plural) agar konsisten dengan `/categories`, `/assets`, dan `/complaints`.
