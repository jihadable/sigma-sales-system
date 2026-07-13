import { prisma } from '../config/db';

export interface ProductInfo {
  id: number;
  code: string;
  name: string;
  isBundle: boolean;
  pricesByPlatform: Map<string, number>; // platform -> hpp
  bundleChildren: Array<{ productId: number; code: string; name: string; qty: number; omzetSplit: number | null; hpp: number | null }>;
}

export interface StoreInfo {
  id: number;
  rawToko: string;
  namaToko: string;
  platform: string;
  admin: string | null;
  defaultAdvertiser: string | null;
}

// Cache seluruh master data dalam satu kali query (bulk load), lalu dipakai
// sebagai lookup table in-memory selama proses import berjalan.
// Ini menghindari query per-baris (N+1) ke database saat validasi ratusan/ribuan baris.
export class MasterDataCache {
  private productsByCode = new Map<string, ProductInfo>();
  private storesByRawToko = new Map<string, StoreInfo>();
  private regionByProvince = new Map<string, string>();

  async load() {
    const [products, prices, bundles, stores, regions] = await Promise.all([
      prisma.product.findMany(),
      prisma.productPrice.findMany(),
      prisma.bundleItem.findMany({ include: { childProduct: true } }),
      prisma.store.findMany(),
      prisma.regionMapping.findMany(),
    ]);

    for (const p of products) {
      this.productsByCode.set(p.code, {
        id: p.id,
        code: p.code,
        name: p.name,
        isBundle: p.isBundle,
        pricesByPlatform: new Map(),
        bundleChildren: [],
      });
    }
    for (const pr of prices) {
      const product = [...this.productsByCode.values()].find((p) => p.id === pr.productId);
      if (product) product.pricesByPlatform.set(pr.platform, Number(pr.hpp));
    }
    for (const b of bundles) {
      const parent = [...this.productsByCode.values()].find((p) => p.id === b.bundleProductId);
      if (parent) {
        parent.bundleChildren.push({
          productId: b.childProductId,
          code: b.childProduct.code,
          name: b.childProduct.name,
          qty: b.qty,
          omzetSplit: b.omzetSplit ? Number(b.omzetSplit) : null,
          hpp: b.hppOverride ? Number(b.hppOverride) : null,
        });
      }
    }
    for (const s of stores) {
      this.storesByRawToko.set(s.rawToko, {
        id: s.id,
        rawToko: s.rawToko,
        namaToko: s.namaToko,
        platform: s.platform,
        admin: s.admin,
        defaultAdvertiser: s.defaultAdvertiser,
      });
    }
    for (const r of regions) {
      this.regionByProvince.set(r.province, r.region);
    }

    return this;
  }

  getProduct(code: string): ProductInfo | undefined {
    return this.productsByCode.get(code);
  }

  getStore(rawToko: string): StoreInfo | undefined {
    return this.storesByRawToko.get(rawToko);
  }

  getRegion(province: string | null): string | null {
    if (!province) return null;
    return this.regionByProvince.get(province) ?? null;
  }

  // HPP produk pada platform tertentu, fallback ke platform pertama yang tersedia jika tidak ditemukan exact match
  getHpp(product: ProductInfo, platform: string): number | null {
    if (product.pricesByPlatform.has(platform)) return product.pricesByPlatform.get(platform)!;
    const first = product.pricesByPlatform.values().next();
    return first.done ? null : first.value;
  }
}
