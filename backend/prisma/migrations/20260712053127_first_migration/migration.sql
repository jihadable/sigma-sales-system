-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isBundle" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "hpp" DECIMAL(14,2) NOT NULL,
    "hargaJual" DECIMAL(14,2),

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleItem" (
    "id" SERIAL NOT NULL,
    "bundleProductId" INTEGER NOT NULL,
    "childProductId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "omzetSplit" DECIMAL(14,2),
    "hppOverride" DECIMAL(14,2),

    CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" SERIAL NOT NULL,
    "rawToko" TEXT NOT NULL,
    "namaToko" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "admin" TEXT,
    "defaultAdvertiser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionMapping" (
    "id" SERIAL NOT NULL,
    "province" TEXT NOT NULL,
    "region" TEXT NOT NULL,

    CONSTRAINT "RegionMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" SERIAL NOT NULL,
    "fileDailyName" TEXT,
    "fileMpName" TEXT,
    "fileProdukName" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "financeFilePath" TEXT,
    "marketingFilePath" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportError" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "awb" TEXT,
    "tanggalPesanan" TIMESTAMP(3) NOT NULL,
    "tanggalClosing" TIMESTAMP(3) NOT NULL,
    "group" TEXT,
    "kanal" TEXT,
    "metodeBayar" TEXT,
    "tokoRaw" TEXT NOT NULL,
    "namaToko" TEXT,
    "platform" TEXT,
    "typeTransaksi" TEXT,
    "advertiser" TEXT,
    "admin" TEXT,
    "ekspedisi" TEXT,
    "note" TEXT,
    "kodePromo" TEXT,
    "customerPhone" TEXT,
    "customerName" TEXT,
    "province" TEXT,
    "region" TEXT,
    "kabupaten" TEXT,
    "kecamatan" TEXT,
    "statusOrder" TEXT DEFAULT 'DELIVERY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "totalLine" DECIMAL(14,2) NOT NULL,
    "hpp" DECIMAL(14,2) NOT NULL,
    "isBundleChild" BOOLEAN NOT NULL DEFAULT false,
    "parentProductCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPrice_productId_platform_key" ON "ProductPrice"("productId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "BundleItem_bundleProductId_childProductId_key" ON "BundleItem"("bundleProductId", "childProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_rawToko_key" ON "Store"("rawToko");

-- CreateIndex
CREATE UNIQUE INDEX "RegionMapping_province_key" ON "RegionMapping"("province");

-- CreateIndex
CREATE INDEX "Order_tanggalPesanan_idx" ON "Order"("tanggalPesanan");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_sourceFile_key" ON "Order"("orderNumber", "sourceFile");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_bundleProductId_fkey" FOREIGN KEY ("bundleProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_childProductId_fkey" FOREIGN KEY ("childProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportError" ADD CONSTRAINT "ImportError_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
