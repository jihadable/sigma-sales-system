import ExcelJS from 'exceljs';
import { Request, Response } from 'express';
import path from 'path';
import { prisma } from '../config/db';
import { importQueue } from '../queue/import.queue';

// POST /api/import  (multipart: fields "daily", "mp", "produk")
export async function uploadAndImport(req: Request, res: Response) {
  const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
  const daily = files?.daily?.[0];
  const mp = files?.mp?.[0];
  const produk = files?.produk?.[0];

  if (!daily && !mp && !produk) {
    return res.status(400).json({ error: 'Minimal 1 file harus diupload (daily, mp, atau produk)' });
  }

  const batch = await prisma.importBatch.create({
    data: {
      fileDailyName: daily?.originalname,
      fileMpName: mp?.originalname,
      fileProdukName: produk?.originalname,
      status: 'PENDING',
    },
  });

  await importQueue.add('process-import', {
    batchId: batch.id,
    files: {
      daily: daily?.path,
      mp: mp?.path,
      produk: produk?.path,
    },
  });

  res.status(202).json({ batchId: batch.id, status: 'PENDING' });
}

// GET /api/import/:batchId
export async function getBatchStatus(req: Request, res: Response) {
  const batchId = Number(req.params.batchId);
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) return res.status(404).json({ error: 'Batch tidak ditemukan' });
  res.json(batch);
}

// GET /api/import/:batchId/download/:type   type = finance | marketing
export async function downloadOutput(req: Request, res: Response) {
  const batchId = Number(req.params.batchId);
  const type = req.params.type;
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) return res.status(404).json({ error: 'Batch tidak ditemukan' });

  const filePath = type === 'finance' ? batch.financeFilePath : batch.marketingFilePath;
  if (!filePath) return res.status(404).json({ error: 'File output belum tersedia' });

  res.download(path.resolve(filePath));
}

// GET /api/import/:batchId/errors  -> JSON list
export async function getBatchErrors(req: Request, res: Response) {
  const batchId = Number(req.params.batchId);
  const errors = await prisma.importError.findMany({ where: { batchId }, orderBy: { id: 'asc' } });
  res.json(errors);
}

// GET /api/import/:batchId/errors/download -> downloadable xlsx error report
export async function downloadErrorReport(req: Request, res: Response) {
  const batchId = Number(req.params.batchId);
  const errors = await prisma.importError.findMany({ where: { batchId }, orderBy: { id: 'asc' } });

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Error Report');
  sheet.columns = [
    { header: 'Source File', key: 'sourceFile', width: 14 },
    { header: 'Row Number', key: 'rowNumber', width: 12 },
    { header: 'Reason', key: 'reason', width: 50 },
    { header: 'Raw Data', key: 'rawData', width: 80 },
  ];
  for (const e of errors) {
    sheet.addRow({
      sourceFile: e.sourceFile,
      rowNumber: e.rowNumber,
      reason: e.reason,
      rawData: JSON.stringify(e.rawData),
    });
  }

  res.setHeader('Content-Disposition', `attachment; filename=error-report-batch${batchId}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await wb.xlsx.write(res);
  res.end();
}

// GET /api/import  -> history list
export async function listBatches(req: Request, res: Response) {
  const batches = await prisma.importBatch.findMany({
    orderBy: { id: 'desc' },
    take: 50,
  });
  res.json(batches);
}
