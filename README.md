# Sigma Sales Import & Transformation System

Sistem fullstack untuk mengimport 3 file Excel data sales (Sales Daily, Sales Marketplace, Sales Produk),
memvalidasi & mentransformasi datanya melalui database, lalu menghasilkan 2 file output otomatis
(**Finance.xlsx** dan **Marketing.xlsx**) — dibuat untuk Business Case dari PT. Sigma Digital Nusantara.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Node.js + Express.js + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Queue | BullMQ + Redis |
| Realtime | Socket.IO |
| Frontend | React + TypeScript + Tailwind CSS + Vite |
| File Excel | ExcelJS |

## Arsitektur Singkat

```
Upload 3 file Excel (drag & drop)
        │
        ▼
  POST /api/import  → simpan file ke disk, buat ImportBatch (status PENDING), push job ke BullMQ
        │
        ▼
  Worker (proses terpisah) ambil job dari queue
        │
        ▼
  parser.service   → baca Excel jadi RawRow (header-based, bukan index hardcode)
  mapping.service  → load master data (Product, Store, RegionMapping) sekali (bulk), cache in-memory
  transform.service→ validasi per baris via master data DB + expand produk bundling
        │
        ▼
  Simpan Order + OrderItem (upsert by orderNumber+sourceFile → aman untuk re-import)
  Baris invalid → ImportError (downloadable sebagai error report)
        │
        ▼
  output.service   → generate Finance.xlsx & Marketing.xlsx
        │
        ▼
  Progress tiap tahap dipublish via Redis pub/sub → direlay API server ke client via Socket.IO
```

Kenapa progress lewat Redis pub/sub (bukan langsung panggil socket.io dari worker)?
Karena worker adalah **proses Node terpisah** dari API server (best practice untuk job queue
yang menangani file besar secara async), sehingga tidak berbagi instance Socket.IO secara langsung.

## Struktur Folder

```
sigma-sales-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # skema DB lengkap + master data tables
│   │   └── seed.ts            # data awal (produk, toko, bundle, region) dari sample file
│   └── src/
│       ├── config/db.ts
│       ├── controllers/       # import.controller.ts, dashboard.controller.ts
│       ├── routes/
│       ├── services/
│       │   ├── parser.service.ts     # baca Excel -> RawRow
│       │   ├── mapping.service.ts    # cache master data, bulk load
│       │   ├── transform.service.ts  # validasi & transformasi bisnis (bundling, HPP per platform, dst)
│       │   ├── output.service.ts     # generate Finance.xlsx & Marketing.xlsx
│       │   └── import.service.ts     # orchestrator utama
│       ├── queue/              # BullMQ queue + worker
│       ├── sockets/            # Socket.IO + Redis relay
│       └── index.ts            # entrypoint API
├── frontend/
│   └── src/
│       ├── pages/ (UploadPage, DashboardPage, HistoryPage)
│       ├── components/ (UploadDropzone, ProgressBar)
│       ├── hooks/useSocket.ts
│       └── api/client.ts
├── docker-compose.yml           # Postgres + Redis
├── PROBLEM.md
└── README.md
```

## Cara Menjalankan

### 1. Jalankan Postgres & Redis

```bash
docker compose up -d
```

### 2. Setup Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate      # buat tabel di DB
npm run prisma:seed         # isi master data awal (produk, toko, bundle, region)
npm run dev                 # jalankan API server (port 4000)
```

Buka terminal baru, jalankan worker (proses import berjalan di sini):

```bash
cd backend
npm run worker
```

### 3. Setup Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # buka http://localhost:5173
```

### 4. Coba Import

Upload 3 file sample yang ada di Business Case (`Input_-_SALES_DAILY.xlsx`,
`Input_-_SALES_MP.xlsx`, `Input_-_SALES_PRODUK.xlsx`) lewat halaman Import. Progress akan
muncul real-time, lalu file `Finance.xlsx` dan `Marketing.xlsx` bisa langsung diunduh.

## Master Data (Bukan Hardcode)

Validasi & mapping dilakukan lewat tabel database, bisa diubah tanpa ubah kode:

- **Product** — kode produk → nama produk, termasuk flag `isBundle`
- **ProductPrice** — HPP per produk **per platform** (WEB/SHOPEE/TIKTOK SHOP bisa beda)
- **BundleItem** — komposisi produk bundling (1 bundle → 2+ produk anak, masing-masing punya omzet & HPP sendiri)
- **Store** — normalisasi kolom "Toko" mentah → nama toko, platform, admin default, advertiser default
- **RegionMapping** — provinsi → region (dipakai laporan Marketing)

Tambah/ubah master data lewat Prisma Studio: `npm run prisma:studio` (di folder backend).

## Fitur yang Sudah Diimplementasikan

- [x] Upload 3 file Excel sekaligus (drag & drop, boleh sebagian)
- [x] Validasi otomatis per baris via master data DB (bukan hardcode)
- [x] Notifikasi real-time (progress bar + toast) via Socket.IO + Redis pub/sub
- [x] Generate 2 file output otomatis sesuai format asli
- [x] History log lengkap (`ImportBatch`) + error report downloadable (`.xlsx`)
- [x] Dashboard summary statistik (total order, omzet, HPP, breakdown per platform/advertiser)
- [x] Produk bundling (1 baris → N produk anak dengan omzet/HPP masing-masing)
- [x] HPP/harga beda per platform
- [x] Proses async via job queue (BullMQ) — siap untuk file besar
- [x] Re-import aman (upsert by orderNumber+sourceFile, tanpa duplikasi)

Lihat `PROBLEM.md` untuk detail kendala teknis & solusi yang diterapkan.
