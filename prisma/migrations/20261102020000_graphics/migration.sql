CREATE TABLE "GraphicAsset" ("id" TEXT NOT NULL,"slug" TEXT NOT NULL,"fileId" TEXT NOT NULL,"published" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "GraphicAsset_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "GraphicAsset_slug_key" ON "GraphicAsset"("slug");
CREATE UNIQUE INDEX "GraphicAsset_fileId_key" ON "GraphicAsset"("fileId");
ALTER TABLE "GraphicAsset" ADD CONSTRAINT "GraphicAsset_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyDevelopment" ADD COLUMN "illustrationId" TEXT;
ALTER TABLE "WeeklyDevelopment" ADD CONSTRAINT "WeeklyDevelopment_illustrationId_fkey" FOREIGN KEY ("illustrationId") REFERENCES "GraphicAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
