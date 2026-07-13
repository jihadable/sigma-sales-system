import ExcelJS from 'exceljs';

export type SourceFile = 'DAILY' | 'MP' | 'PRODUK';

// Baris mentah hasil parsing, sudah diseragamkan namanya lintas 3 jenis file
export interface RawRow {
  rowNumber: number;
  sourceFile: SourceFile;
  no: number | null;
  date: Date | null;
  group: string | null;
  kanal: string | null;
  metodeBayar: string | null;
  toko: string | null;
  adv: string | null; // hanya ada di DAILY & PRODUK
  typeTransaksi: string | null;
  orderNumber: string | null;
  awb: string | null;
  customerPhone: string | null;
  customerName: string | null;
  billingAddress: string | null;
  provinsi: string | null;
  kabupaten: string | null;
  kecamatan: string | null;
  note: string | null;
  productCode: string | null;
  quantity: number | null;
  unitPrice: number | null;
  totalPerLine: number | null;
  ekspedisi: string | null;
  warehouse: string | null;
  statusOrder: string | null;
}

// Mapping header (case-insensitive) -> field RawRow, per jenis file.
// Disimpan sebagai config, bukan index posisi hardcode, supaya tahan bila urutan kolom berubah (asal nama header sama).
const HEADER_MAP: Record<SourceFile, Record<string, keyof RawRow>> = {
  DAILY: {
    no: 'no', date: 'date', group: 'group', kanal: 'kanal', metodebayar: 'metodeBayar',
    toko: 'toko', adv: 'adv', typetransaksi: 'typeTransaksi', ordernumber: 'orderNumber',
    awb: 'awb', customerphonenumber: 'customerPhone', customerdisplayname: 'customerName',
    billingaddress: 'billingAddress', provinsicustomer: 'provinsi', kabupatencustomer: 'kabupaten',
    kecamatancustomer: 'kecamatan', note: 'note', productcode: 'productCode', quantity: 'quantity',
    unitprice: 'unitPrice', totalperline: 'totalPerLine', ekspedisi: 'ekspedisi',
    warehouse: 'warehouse', 'statusorder': 'statusOrder', 'status order': 'statusOrder',
  },
  MP: {
    no: 'no', date: 'date', group: 'group', kanal: 'kanal', metodebayar: 'metodeBayar',
    toko: 'toko', typetransaksi: 'typeTransaksi', ordernumber: 'orderNumber', awb: 'awb',
    note: 'note', productcode: 'productCode', quantity: 'quantity', unitprice: 'unitPrice',
    totalperline: 'totalPerLine', ekspedisi: 'ekspedisi', city: 'kabupaten', province: 'provinsi',
  },
  PRODUK: {
    no: 'no', date: 'date', group: 'group', kanal: 'kanal', metodebayar: 'metodeBayar',
    toko: 'toko', adv: 'adv', typetransaksi: 'typeTransaksi', ordernumber: 'orderNumber',
    awb: 'awb', customerphonenumber: 'customerPhone', customerdisplayname: 'customerName',
    billingaddress: 'billingAddress', provinsicustomer: 'provinsi', kabupatencustomer: 'kabupaten',
    kecamatancustomer: 'kecamatan', note: 'note', productcode: 'productCode', quantity: 'quantity',
    unitprice: 'unitPrice', totalperline: 'totalPerLine', ekspedisi: 'ekspedisi',
  },
};

function normalizeHeader(h: string): string {
  return String(h || '').trim().toLowerCase();
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

export async function parseExcelFile(filePath: string, sourceFile: SourceFile): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const colIndexToField: Record<number, keyof RawRow> = {};
  headerRow.eachCell((cell, colNumber) => {
    const key = normalizeHeader(String(cell.value));
    const field = HEADER_MAP[sourceFile][key];
    if (field) colIndexToField[colNumber] = field;
  });

  const rows: RawRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const values: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const field = colIndexToField[colNumber];
      if (field) values[field] = cell.value;
    });

    // Lewati baris kosong total (mis. baris sisa template tanpa data)
    const hasAnyValue = Object.values(values).some((v) => v !== null && v !== undefined && v !== '');
    if (!hasAnyValue) return;

    rows.push({
      rowNumber,
      sourceFile,
      no: toNumber(values.no),
      date: toDate(values.date),
      group: toStr(values.group),
      kanal: toStr(values.kanal),
      metodeBayar: toStr(values.metodeBayar),
      toko: toStr(values.toko),
      adv: toStr(values.adv),
      typeTransaksi: toStr(values.typeTransaksi),
      orderNumber: toStr(values.orderNumber),
      awb: toStr(values.awb),
      customerPhone: toStr(values.customerPhone),
      customerName: toStr(values.customerName),
      billingAddress: toStr(values.billingAddress),
      provinsi: toStr(values.provinsi),
      kabupaten: toStr(values.kabupaten),
      kecamatan: toStr(values.kecamatan),
      note: toStr(values.note),
      productCode: toStr(values.productCode),
      quantity: toNumber(values.quantity),
      unitPrice: toNumber(values.unitPrice),
      totalPerLine: toNumber(values.totalPerLine),
      ekspedisi: toStr(values.ekspedisi),
      warehouse: toStr(values.warehouse),
      statusOrder: toStr(values.statusOrder),
    });
  });

  return rows;
}
