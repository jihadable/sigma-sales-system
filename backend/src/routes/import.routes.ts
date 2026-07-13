import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  uploadAndImport,
  getBatchStatus,
  downloadOutput,
  getBatchErrors,
  downloadErrorReport,
  listBatches,
} from '../controllers/import.controller';

const storageDir = process.env.STORAGE_DIR || './storage';
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(storageDir, 'uploads'),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.fieldname}-${file.originalname}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    if (ok) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file .xlsx/.xls yang diperbolehkan'));
    }
  },
});

const router = Router();

router.post(
  '/',
  upload.fields([
    { name: 'daily', maxCount: 1 },
    { name: 'mp', maxCount: 1 },
    { name: 'produk', maxCount: 1 },
  ]),
  uploadAndImport,
);
router.get('/', listBatches);
router.get('/:batchId', getBatchStatus);
router.get('/:batchId/download/:type', downloadOutput);
router.get('/:batchId/errors', getBatchErrors);
router.get('/:batchId/errors/download', downloadErrorReport);

export default router;
