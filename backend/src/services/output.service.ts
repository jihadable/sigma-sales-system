import ExcelJS from 'exceljs';
import path from 'path';
import { prisma } from '../config/db';

const MONTH_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function generateOutputs(batchId: number, storageDir: string) {
  const orders = await prisma.order.findMany({
    where: { batchId },
    include: { items: true },
    orderBy: { id: 'asc' },
  });

  // ---------- FINANCE.xlsx ----------
  const financeWb = new ExcelJS.Workbook();
  const financeSheet = financeWb.addWorksheet('Sheet1');
  financeSheet.columns = [
    { header: 'Tanggal Closing', key: 'tanggalClosing', width: 16 },
    { header: 'Tanggal Pesanan', key: 'tanggalPesanan', width: 16 },
    { header: 'No. Invoice', key: 'noInvoice', width: 14 },
    { header: 'No Resi', key: 'noResi', width: 10 },
    { header: 'Ekspedisi', key: 'ekspedisi', width: 18 },
    { header: 'Type Transaksi', key: 'typeTransaksi', width: 14 },
    { header: 'Advertiser', key: 'advertiser', width: 14 },
    { header: 'Platform', key: 'platform', width: 14 },
    { header: 'Nama Toko', key: 'namaToko', width: 12 },
    { header: 'Admin', key: 'admin', width: 12 },
    { header: 'Produk Name', key: 'produkName', width: 16 },
    { header: 'Jumlah', key: 'jumlah', width: 10 },
    { header: 'Omzet', key: 'omzet', width: 12 },
    { header: 'HPP Sigma', key: 'hpp', width: 12 },
    { header: 'TaxName(%)', key: 'taxName', width: 12 },
    { header: 'Total Bayar', key: 'totalBayar', width: 12 },
    { header: 'Payment type', key: 'paymentType', width: 12 },
  ];

  for (const order of orders) {
    for (const item of order.items) {
      financeSheet.addRow({
        tanggalClosing: fmtDate(order.tanggalClosing),
        tanggalPesanan: fmtDate(order.tanggalPesanan),
        noInvoice: order.orderNumber,
        noResi: order.awb ?? '',
        ekspedisi: order.ekspedisi ?? '',
        typeTransaksi: order.typeTransaksi ?? '',
        advertiser: order.advertiser ?? '',
        platform: order.platform ?? '',
        namaToko: order.namaToko ?? '',
        admin: order.admin ?? '',
        produkName: item.productName,
        jumlah: item.quantity,
        omzet: Number(item.totalLine),
        hpp: Number(item.hpp),
        taxName: order.kodePromo ?? '',
        totalBayar: Number(item.totalLine),
        paymentType: order.metodeBayar ?? '',
      });
    }
  }

  const financePath = path.join(storageDir, 'outputs', `FINANCE_batch${batchId}.xlsx`);
  await financeWb.xlsx.writeFile(financePath);

  // ---------- MARKETING.xlsx ----------
  const marketingWb = new ExcelJS.Workbook();
  const marketingSheet = marketingWb.addWorksheet('Sheet1');
  marketingSheet.columns = [
    { header: 'Tahun', key: 'tahun', width: 8 },
    { header: 'Bulan', key: 'bulan', width: 10 },
    { header: 'Tanggal Closing', key: 'tanggalClosing', width: 16 },
    { header: 'Tanggal Pesanan', key: 'tanggalPesanan', width: 16 },
    { header: 'No. Invoice', key: 'noInvoice', width: 14 },
    { header: 'No. Resi', key: 'noResi', width: 10 },
    { header: 'Memo', key: 'memo', width: 10 },
    { header: 'Region', key: 'region', width: 12 },
    { header: 'Ekspedisi', key: 'ekspedisi', width: 18 },
    { header: 'Advertiser', key: 'advertiser', width: 14 },
    { header: 'Platform', key: 'platform', width: 14 },
    { header: 'Nama Toko', key: 'namaToko', width: 12 },
    { header: 'Admin', key: 'admin', width: 12 },
    { header: 'Produk', key: 'produk', width: 16 },
    { header: 'Jumlah', key: 'jumlah', width: 10 },
    { header: 'Omzet', key: 'omzet', width: 12 },
    { header: 'HPP', key: 'hpp', width: 12 },
    { header: 'Kode Promo', key: 'kodePromo', width: 12 },
    { header: 'Total Bayar', key: 'totalBayar', width: 12 },
    { header: 'Metode Pembayaran', key: 'metodePembayaran', width: 16 },
    { header: 'SKU', key: 'sku', width: 10 },
  ];

  for (const order of orders) {
    for (const item of order.items) {
      marketingSheet.addRow({
        tahun: order.tanggalPesanan.getFullYear(),
        bulan: MONTH_ID[order.tanggalPesanan.getMonth()],
        tanggalClosing: fmtDate(order.tanggalClosing),
        tanggalPesanan: fmtDate(order.tanggalPesanan),
        noInvoice: order.orderNumber,
        noResi: order.awb ?? '',
        memo: order.typeTransaksi ?? '',
        region: order.region ?? '',
        ekspedisi: order.ekspedisi ?? '',
        advertiser: order.advertiser ?? '',
        platform: order.platform ?? '',
        namaToko: order.namaToko ?? '',
        admin: order.admin ?? '',
        produk: item.productName,
        jumlah: item.quantity,
        omzet: Number(item.totalLine),
        hpp: Number(item.hpp),
        kodePromo: order.kodePromo ?? '',
        totalBayar: Number(item.totalLine),
        metodePembayaran: order.metodeBayar ?? '',
        sku: item.isBundleChild ? item.parentProductCode : item.productCode,
      });
    }
  }

  const marketingPath = path.join(storageDir, 'outputs', `MARKETING_batch${batchId}.xlsx`);
  await marketingWb.xlsx.writeFile(marketingPath);

  return { financePath, marketingPath };
}
