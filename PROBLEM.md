# Problem & Solusi

## 1. Format tidak konsisten antar 3 file input

**Masalah:** `Sales Daily` dan `Sales Produk` punya kolom ADV + data customer lengkap, sementara
`Sales MP` tidak punya kolom ADV dan datanya lebih ringkas (langsung dari marketplace).

**Solusi:** `parser.service.ts` memakai *header map* per jenis file (bukan index kolom hardcode),
sehingga tiap jenis file dipetakan ke struktur `RawRow` yang seragam. Field yang tidak ada di
suatu file (mis. ADV di file MP) di-lookup dari master data `Store.defaultAdvertiser` saat
tahap transform, bukan dianggap error.

## 2. Produk bundling (1 baris input → beberapa baris output)

**Masalah:** Produk seperti `BDL01` sebenarnya berisi 2+ produk (`BOXL A`, `BOXL B`), masing-masing
punya omzet dan HPP sendiri di file output, padahal di input hanya 1 baris.

**Solusi:** Tabel `BundleItem` menyimpan komposisi tiap produk bundle (produk anak, qty, alokasi
omzet, HPP). Saat transform, jika `Product.isBundle = true`, 1 baris input di-*expand* menjadi
N `OrderItem` sesuai komposisi di DB.

## 3. HPP/harga jual beda tiap platform penjualan

**Masalah:** Produk yang sama bisa punya HPP berbeda di WEB vs SHOPEE vs TIKTOK SHOP.

**Solusi:** Tabel `ProductPrice(productId, platform, hpp)` dengan unique constraint pada
`(productId, platform)`. `mapping.service.ts` menyediakan `getHpp(product, platform)` yang
mengambil HPP sesuai platform toko asal transaksi (dari tabel `Store.platform`).

## 4. Duplikasi data saat re-import file yang sama

**Masalah:** Jika user mengupload ulang file yang sama (mis. ada revisi), data tidak boleh
terduplikasi.

**Solusi:** `Order` punya unique constraint `(orderNumber, sourceFile)`. Proses simpan memakai
`upsert` — order lama di-update, `OrderItem` lama dihapus lalu diinsert ulang sesuai hasil
transform terbaru. Idempotent: import berkali-kali dengan data sama menghasilkan state akhir
yang sama.

## 5. File Excel berukuran besar

**Masalah:** Membaca ribuan baris sekaligus secara sinkron di request HTTP bisa timeout &
memory-heavy.

**Solusi:** Proses import dijalankan **async lewat job queue (BullMQ + Redis)**. Endpoint upload
hanya menyimpan file lalu langsung return `202 Accepted` dengan `batchId`; pemrosesan sesungguhnya
berjalan di proses `worker` terpisah. Progress dikirim ke client secara real-time lewat Socket.IO
(direlay lewat Redis pub/sub karena worker & API server adalah proses berbeda).

## 6. Nama kolom Excel bisa berubah

**Masalah:** Jika tim ops mengubah urutan kolom di template Excel, sistem tidak boleh rusak.

**Solusi:** `parser.service.ts` membaca berdasarkan **nama header** (case-insensitive, di-trim),
bukan posisi/index kolom. Selama nama header masih sama, urutan kolom boleh berubah bebas.

## 7. Validasi & mapping tanpa hardcode

**Masalah:** Requirement eksplisit meminta validasi per baris "via DB bukan hardcode".

**Solusi:** Semua aturan bisnis (produk valid, komposisi bundle, HPP per platform, mapping toko →
admin/advertiser/platform, mapping provinsi → region) disimpan sebagai master data di tabel
`Product`, `ProductPrice`, `BundleItem`, `Store`, `RegionMapping`. Tim ops bisa menambah/mengubah
data ini lewat Prisma Studio tanpa deploy ulang kode.

## 8. Efektivitas database

**Solusi yang diterapkan:**
- **Bulk load master data** sekali di awal proses (`MasterDataCache.load()`) lalu dipakai sebagai
  in-memory lookup untuk semua baris — menghindari N+1 query per baris.
- **Index** pada `Order.tanggalPesanan` dan `OrderItem.orderId` untuk query dashboard/history yang cepat.
- **`createMany`** untuk insert `OrderItem` per order (bukan insert satu-satu).
- Relasi antar tabel dirancang normalized (`Order` 1—N `OrderItem`, `Product` 1—N `ProductPrice`,
  `Product` 1—N `BundleItem`) sesuai kaidah relasional, minim redundansi data.

## Potensi Pengembangan Lanjutan (Kreativitas/Add-On)

- Rollback data per batch (hapus semua `Order` dengan `batchId` tertentu + regenerate).
- Endpoint re-generate output tanpa perlu re-upload file (dari data yang sudah tersimpan).
- Validasi checksum file untuk mendeteksi upload file yang identik persis.
