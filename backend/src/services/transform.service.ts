import { RawRow } from './parser.service';
import { MasterDataCache } from './mapping.service';

export interface TransformError {
  sourceFile: string;
  rowNumber: number;
  reason: string;
  rawData: RawRow;
}

export interface OrderItemDraft {
  productId: number | null;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalLine: number;
  hpp: number;
  isBundleChild: boolean;
  parentProductCode: string | null;
}

export interface OrderDraft {
  sourceFile: string;
  orderNumber: string;
  awb: string | null;
  tanggalPesanan: Date;
  tanggalClosing: Date;
  group: string | null;
  kanal: string | null;
  metodeBayar: string | null;
  tokoRaw: string;
  namaToko: string | null;
  platform: string | null;
  typeTransaksi: string | null;
  advertiser: string | null;
  admin: string | null;
  ekspedisi: string | null;
  note: string | null;
  kodePromo: string | null;
  customerPhone: string | null;
  customerName: string | null;
  province: string | null;
  region: string | null;
  kabupaten: string | null;
  kecamatan: string | null;
  statusOrder: string | null;
  items: OrderItemDraft[];
}

// Ambil segmen terakhir dari Note yang dipisah "/", dipakai sebagai Kode Promo / Tax field.
// contoh: "RN/CO/CODE" -> "CODE", "ZIP" -> "ZIP"
function extractKodePromo(note: string | null): string | null {
  if (!note) return null;
  const parts = note.split('/');
  return parts[parts.length - 1].trim() || null;
}

function requireField<T>(value: T | null | undefined, fieldName: string, errors: string[]): value is T {
  if (value === null || value === undefined || value === '') {
    errors.push(`Field "${fieldName}" wajib diisi`);
    return false;
  }
  return true;
}

/**
 * Transform 1 baris mentah menjadi 1 OrderDraft (dengan 1..N OrderItemDraft, hasil expand bundling).
 * Semua lookup (produk, toko, region) dilakukan lewat MasterDataCache -> DB, bukan hardcode.
 * Mengembalikan null + push ke errors[] jika baris tidak valid.
 */
export function transformRow(row: RawRow, cache: MasterDataCache, errors: TransformError[]): OrderDraft | null {
  const rowErrors: string[] = [];

  requireField(row.orderNumber, 'OrderNumber', rowErrors);
  requireField(row.date, 'Date', rowErrors);
  requireField(row.toko, 'Toko', rowErrors);
  requireField(row.productCode, 'ProductCode', rowErrors);
  requireField(row.quantity, 'Quantity', rowErrors);
  requireField(row.unitPrice, 'UnitPrice', rowErrors);

  if (rowErrors.length > 0) {
    errors.push({ sourceFile: row.sourceFile, rowNumber: row.rowNumber, reason: rowErrors.join('; '), rawData: row });
    return null;
  }

  const store = cache.getStore(row.toko!);
  if (!store) {
    errors.push({
      sourceFile: row.sourceFile,
      rowNumber: row.rowNumber,
      reason: `Toko "${row.toko}" tidak ditemukan di master data Store`,
      rawData: row,
    });
    return null;
  }

  const product = cache.getProduct(row.productCode!);
  if (!product) {
    errors.push({
      sourceFile: row.sourceFile,
      rowNumber: row.rowNumber,
      reason: `ProductCode "${row.productCode}" tidak ditemukan di master data Product`,
      rawData: row,
    });
    return null;
  }

  const platform = store.platform;
  const advertiser = row.adv ?? store.defaultAdvertiser ?? null;
  const region = cache.getRegion(row.provinsi);
  const kodePromo = extractKodePromo(row.note);

  const items: OrderItemDraft[] = [];

  if (product.isBundle) {
    if (product.bundleChildren.length < 2) {
      errors.push({
        sourceFile: row.sourceFile,
        rowNumber: row.rowNumber,
        reason: `Produk bundle "${product.code}" harus berisi minimal 2 produk anak di master data`,
        rawData: row,
      });
      return null;
    }
    for (const child of product.bundleChildren) {
      const hpp = child.hpp ?? cache.getHpp(cache.getProduct(child.code)!, platform) ?? 0;
      items.push({
        productId: child.productId,
        productCode: child.code,
        productName: child.name,
        quantity: child.qty * (row.quantity ?? 1),
        unitPrice: child.omzetSplit ?? 0,
        totalLine: child.omzetSplit ?? 0,
        hpp,
        isBundleChild: true,
        parentProductCode: product.code,
      });
    }
  } else {
    const hpp = cache.getHpp(product, platform) ?? 0;
    items.push({
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      quantity: row.quantity!,
      unitPrice: row.unitPrice!,
      totalLine: row.totalPerLine ?? row.unitPrice! * row.quantity!,
      hpp,
      isBundleChild: false,
      parentProductCode: null,
    });
  }

  const tanggal = row.date!;

  return {
    sourceFile: row.sourceFile,
    orderNumber: row.orderNumber!,
    awb: row.awb,
    tanggalPesanan: tanggal,
    tanggalClosing: tanggal,
    group: row.group,
    kanal: row.kanal,
    metodeBayar: row.metodeBayar,
    tokoRaw: row.toko!,
    namaToko: store.namaToko,
    platform,
    typeTransaksi: row.typeTransaksi,
    advertiser,
    admin: store.admin,
    ekspedisi: row.ekspedisi,
    note: row.note,
    kodePromo,
    customerPhone: row.customerPhone,
    customerName: row.customerName,
    province: row.provinsi,
    region,
    kabupaten: row.kabupaten,
    kecamatan: row.kecamatan,
    statusOrder: row.statusOrder ?? 'DELIVERY',
    items,
  };
}
