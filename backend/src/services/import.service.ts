import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { parseExcelFile, SourceFile } from './parser.service';
import { MasterDataCache } from './mapping.service';
import { transformRow, TransformError } from './transform.service';
import { generateOutputs } from './output.service';
import { publishProgress } from '../utils/progressPublisher';

export interface ImportFiles {
  daily?: string; // filepath
  mp?: string;
  produk?: string;
}

function emitProgress(batchId: number, payload: Record<string, unknown>) {
  publishProgress(batchId, payload);
}

export async function runImport(batchId: number, files: ImportFiles) {
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });
  emitProgress(batchId, { status: 'PROCESSING', stage: 'parsing', percent: 5 });

  try {
    const cache = await new MasterDataCache().load();

    const fileEntries: Array<[SourceFile, string | undefined]> = [
      ['DAILY', files.daily],
      ['MP', files.mp],
      ['PRODUK', files.produk],
    ];

    const errors: TransformError[] = [];
    const orderDrafts: ReturnType<typeof transformRow>[] = [];

    let parsedCount = 0;
    for (const [sourceFile, filePath] of fileEntries) {
      if (!filePath) continue;
      const rows = await parseExcelFile(filePath, sourceFile);
      parsedCount += rows.length;
      for (const row of rows) {
        const draft = transformRow(row, cache, errors);
        orderDrafts.push(draft);
      }
      emitProgress(batchId, { status: 'PROCESSING', stage: `parsed:${sourceFile}`, percent: 25 });
    }

    const validDrafts = orderDrafts.filter((d): d is NonNullable<typeof d> => d !== null);

    emitProgress(batchId, { status: 'PROCESSING', stage: 'saving', percent: 50, totalRows: parsedCount });

    // Simpan tiap order + item dalam 1 transaksi per order (upsert by orderNumber+sourceFile
    // untuk mendukung re-import tanpa duplikasi data / unique constraint + upsert logic).
    let saved = 0;
    for (const draft of validDrafts) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const order = await tx.order.upsert({
          where: { orderNumber_sourceFile: { orderNumber: draft.orderNumber, sourceFile: draft.sourceFile } },
          update: {
            batchId,
            awb: draft.awb,
            tanggalPesanan: draft.tanggalPesanan,
            tanggalClosing: draft.tanggalClosing,
            group: draft.group,
            kanal: draft.kanal,
            metodeBayar: draft.metodeBayar,
            tokoRaw: draft.tokoRaw,
            namaToko: draft.namaToko,
            platform: draft.platform,
            typeTransaksi: draft.typeTransaksi,
            advertiser: draft.advertiser,
            admin: draft.admin,
            ekspedisi: draft.ekspedisi,
            note: draft.note,
            kodePromo: draft.kodePromo,
            customerPhone: draft.customerPhone,
            customerName: draft.customerName,
            province: draft.province,
            region: draft.region,
            kabupaten: draft.kabupaten,
            kecamatan: draft.kecamatan,
            statusOrder: draft.statusOrder,
          },
          create: {
            batchId,
            sourceFile: draft.sourceFile,
            orderNumber: draft.orderNumber,
            awb: draft.awb,
            tanggalPesanan: draft.tanggalPesanan,
            tanggalClosing: draft.tanggalClosing,
            group: draft.group,
            kanal: draft.kanal,
            metodeBayar: draft.metodeBayar,
            tokoRaw: draft.tokoRaw,
            namaToko: draft.namaToko,
            platform: draft.platform,
            typeTransaksi: draft.typeTransaksi,
            advertiser: draft.advertiser,
            admin: draft.admin,
            ekspedisi: draft.ekspedisi,
            note: draft.note,
            kodePromo: draft.kodePromo,
            customerPhone: draft.customerPhone,
            customerName: draft.customerName,
            province: draft.province,
            region: draft.region,
            kabupaten: draft.kabupaten,
            kecamatan: draft.kecamatan,
            statusOrder: draft.statusOrder,
          },
        });

        // Re-import: bersihkan item lama punya order ini sebelum insert ulang (idempotent)
        await tx.orderItem.deleteMany({ where: { orderId: order.id } });
        await tx.orderItem.createMany({
          data: draft.items.map((it) => ({
            orderId: order.id,
            productId: it.productId,
            productCode: it.productCode,
            productName: it.productName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalLine: it.totalLine,
            hpp: it.hpp,
            isBundleChild: it.isBundleChild,
            parentProductCode: it.parentProductCode,
          })),
        });
      });
      saved += 1;
      if (saved % 25 === 0) {
        emitProgress(batchId, { status: 'PROCESSING', stage: 'saving', percent: 50 + Math.round((saved / validDrafts.length) * 25) });
      }
    }

    if (errors.length > 0) {
      await prisma.importError.createMany({
        data: errors.map((e) => ({
          batchId,
          sourceFile: e.sourceFile,
          rowNumber: e.rowNumber,
          reason: e.reason,
          rawData: e.rawData as any,
        })),
      });
    }

    emitProgress(batchId, { status: 'PROCESSING', stage: 'generating_output', percent: 80 });
    const storageDir = process.env.STORAGE_DIR || './storage';
    const { financePath, marketingPath } = await generateOutputs(batchId, storageDir);

    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: 'DONE',
        totalRows: parsedCount,
        successRows: validDrafts.length,
        errorRows: errors.length,
        financeFilePath: financePath,
        marketingFilePath: marketingPath,
        finishedAt: new Date(),
      },
    });

    emitProgress(batchId, {
      status: 'DONE',
      stage: 'done',
      percent: 100,
      totalRows: parsedCount,
      successRows: validDrafts.length,
      errorRows: errors.length,
    });
  } catch (err: any) {
    await prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'FAILED', finishedAt: new Date() },
    });
    emitProgress(batchId, { status: 'FAILED', stage: 'error', message: err?.message ?? 'Unknown error' });
    throw err;
  }
}
