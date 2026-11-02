ALTER TABLE "WeeklyDevelopment"
 ADD COLUMN "trimester" INTEGER,
 ADD COLUMN "lengthCm" DOUBLE PRECISION,
 ADD COLUMN "lengthMinCm" DOUBLE PRECISION,
 ADD COLUMN "lengthMaxCm" DOUBLE PRECISION,
 ADD COLUMN "measurementMethod" TEXT,
 ADD COLUMN "developmentHighlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 ADD COLUMN "maternalChanges" TEXT,
 ADD COLUMN "fruitImage" TEXT,
 ADD COLUMN "fruitImageIsPlaceholder" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "sourceNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
 ADD COLUMN "contentVersion" TEXT;
UPDATE "WeeklyDevelopment" SET "reviewStatus"='APPROVED' WHERE "reviewedAt" IS NOT NULL AND "reviewedBy" IS NOT NULL;
ALTER TABLE "WeeklyDevelopment"
 ADD CONSTRAINT "WeeklyDevelopment_status_check" CHECK ("reviewStatus" IN ('DRAFT','PENDING_REVIEW','APPROVED')),
 ADD CONSTRAINT "WeeklyDevelopment_published_status_check" CHECK (NOT "published" OR "reviewStatus"='APPROVED'),
 ADD CONSTRAINT "WeeklyDevelopment_trimester_check" CHECK ("trimester" IS NULL OR "trimester" BETWEEN 1 AND 3),
 ADD CONSTRAINT "WeeklyDevelopment_lengths_check" CHECK (("lengthCm" IS NULL OR "lengthCm">0) AND ("lengthMinCm" IS NULL OR "lengthMinCm">0) AND ("lengthMaxCm" IS NULL OR "lengthMaxCm">0) AND ("lengthMinCm" IS NULL OR "lengthMaxCm" IS NULL OR "lengthMinCm"<="lengthMaxCm"));
