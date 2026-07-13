import { Request, Response } from 'express';
import { prisma } from '../config/db';

// GET /api/dashboard/summary?batchId=optional
export async function getSummary(req: Request, res: Response) {
  const batchId = req.query.batchId ? Number(req.query.batchId) : undefined;
  const where = batchId ? { batchId } : {};

  const [orderCount, itemAgg, byPlatform, byAdvertiser, latestBatches] = await Promise.all([
    prisma.order.count({ where }),
    prisma.orderItem.aggregate({
      where: batchId ? { order: { batchId } } : {},
      _sum: { totalLine: true, hpp: true, quantity: true },
    }),
    prisma.order.groupBy({
      by: ['platform'],
      where,
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ['advertiser'],
      where,
      _count: { _all: true },
    }),
    prisma.importBatch.findMany({ orderBy: { id: 'desc' }, take: 5 }),
  ]);

  res.json({
    totalOrders: orderCount,
    totalOmzet: Number(itemAgg._sum.totalLine ?? 0),
    totalHpp: Number(itemAgg._sum.hpp ?? 0),
    totalQuantity: itemAgg._sum.quantity ?? 0,
    byPlatform,
    byAdvertiser,
    latestBatches,
  });
}
