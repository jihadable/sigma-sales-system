import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding master data...');

  // ---- Products (produk tunggal) ----
  const pr01 = await prisma.product.upsert({
    where: { code: 'PR01' },
    update: {},
    create: { code: 'PR01', name: 'PRODUK SATU', isBundle: false },
  });
  const brg01 = await prisma.product.upsert({
    where: { code: 'BRG01' },
    update: {},
    create: { code: 'BRG01', name: 'BARANG SATU', isBundle: false },
  });
  const boxlA = await prisma.product.upsert({
    where: { code: 'BOXLA' },
    update: {},
    create: { code: 'BOXLA', name: 'BOXL A', isBundle: false },
  });
  const boxlB = await prisma.product.upsert({
    where: { code: 'BOXLB' },
    update: {},
    create: { code: 'BOXLB', name: 'BOXL B', isBundle: false },
  });

  // ---- Produk bundling: BDL01 = BOXL A + BOXL B ----
  const bdl01 = await prisma.product.upsert({
    where: { code: 'BDL01' },
    update: {},
    create: { code: 'BDL01', name: 'BUNDLE BOXL A+B', isBundle: true },
  });

  await prisma.bundleItem.upsert({
    where: { bundleProductId_childProductId: { bundleProductId: bdl01.id, childProductId: boxlA.id } },
    update: {},
    create: { bundleProductId: bdl01.id, childProductId: boxlA.id, qty: 1, omzetSplit: 190000, hppOverride: 27000 },
  });
  await prisma.bundleItem.upsert({
    where: { bundleProductId_childProductId: { bundleProductId: bdl01.id, childProductId: boxlB.id } },
    update: {},
    create: { bundleProductId: bdl01.id, childProductId: boxlB.id, qty: 1, omzetSplit: 90000, hppOverride: 22500 },
  });

  // ---- HPP per produk per platform (HPP/harga bisa beda tiap platform) ----
  const prices: Array<[number, string, number]> = [
    [pr01.id, 'WEB', 56000],
    [pr01.id, 'SHOPEE', 84000],
    [pr01.id, 'TIKTOK SHOP', 70000],
    [brg01.id, 'WEB', 36000],
    [boxlA.id, 'TIKTOK SHOP', 27000],
    [boxlB.id, 'TIKTOK SHOP', 22500],
  ];
  for (const [productId, platform, hpp] of prices) {
    await prisma.productPrice.upsert({
      where: { productId_platform: { productId, platform } },
      update: { hpp },
      create: { productId, platform, hpp },
    });
  }

  // ---- Store master (normalisasi kolom Toko + admin + default advertiser) ----
  const stores: Array<{
    rawToko: string;
    namaToko: string;
    platform: string;
    admin: string;
    defaultAdvertiser?: string;
  }> = [
    { rawToko: 'SC', namaToko: 'SC', platform: 'WEB', admin: 'Putri' },
    { rawToko: 'TIKTOK SHOP|TB', namaToko: 'TB', platform: 'TIKTOK SHOP', admin: 'HANDOKO' },
    { rawToko: 'SHOPEE|raya', namaToko: 'RAYA', platform: 'SHOPEE', admin: 'YAYA', defaultAdvertiser: 'ADV EMPAT' },
  ];
  for (const s of stores) {
    await prisma.store.upsert({ where: { rawToko: s.rawToko }, update: s, create: s });
  }

  // ---- Region mapping (provinsi -> region) ----
  const regions: Array<[string, string]> = [
    ['Jawa Timur', 'JAWA'],
    ['Jawa Barat', 'JAWA'],
    ['Jawa Tengah', 'JAWA'],
    ['Banten', 'JAWA'],
    ['DKI Jakarta', 'JAWA'],
    ['Sumatera Utara', 'SUMATERA'],
    ['Sumatera Barat', 'SUMATERA'],
    ['Kalimantan Timur', 'KALIMANTAN'],
    ['Sulawesi Selatan', 'SULAWESI'],
    ['Bali', 'BALI NUSRA'],
  ];
  for (const [province, region] of regions) {
    await prisma.regionMapping.upsert({ where: { province }, update: { region }, create: { province, region } });
  }

  console.log('Seed selesai.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
