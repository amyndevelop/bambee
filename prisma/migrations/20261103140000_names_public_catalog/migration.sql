-- DropIndex
DROP INDEX "BabyName_normalized_key";

-- AlterTable
ALTER TABLE "BabyName" ADD COLUMN     "adminEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "catalogHash" TEXT,
ADD COLUMN     "catalogKey" TEXT,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'es-AR',
ADD COLUMN     "nameKey" TEXT,
ADD COLUMN     "nameLength" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'editorial_initial';

-- Preserve every existing id and all favorite/vote foreign keys.
UPDATE "BabyName" SET "nameKey" = lower(btrim(normalize("name", NFC))), "nameLength" = char_length("name");
ALTER TABLE "BabyName" ALTER COLUMN "nameKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BabyName_nameKey_key" ON "BabyName"("nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "BabyName_catalogKey_key" ON "BabyName"("catalogKey");

-- CreateIndex
CREATE INDEX "BabyName_published_normalized_idx" ON "BabyName"("published", "normalized");

