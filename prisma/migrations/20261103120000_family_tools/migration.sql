-- AlterTable
ALTER TABLE "PregnancyMember" ADD COLUMN     "cards" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "names" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "questions" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "medical" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assigneeId" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "notes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "remindedAt" TIMESTAMP(3),
ADD COLUMN     "reminderAt" TIMESTAMP(3),
ADD COLUMN     "templateItemKey" TEXT;

-- CreateTable
CREATE TABLE "PreparationCategory" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "templateKey" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PreparationCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BabyName" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "origin" TEXT,
    "meaning" TEXT,
    "variants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pronunciation" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "verification" TEXT NOT NULL DEFAULT 'PENDING',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BabyName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BabyNameChoice" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nameId" TEXT NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "vote" TEXT,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "finalist" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "BabyNameChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareCard" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "showGestation" BOOLEAN NOT NULL DEFAULT false,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "fileId" TEXT,
    "medicalConsent" BOOLEAN NOT NULL DEFAULT false,
    "illustration" TEXT NOT NULL DEFAULT 'brand',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalQuestion" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "answered" BOOLEAN NOT NULL DEFAULT false,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "reminder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BellyTimelapse" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "outputFileId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BellyTimelapse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractionSession" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "instructions" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ContractionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractionRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ContractionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreparationCategory_pregnancyId_position_idx" ON "PreparationCategory"("pregnancyId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PreparationCategory_pregnancyId_templateKey_key" ON "PreparationCategory"("pregnancyId", "templateKey");

-- CreateIndex
CREATE UNIQUE INDEX "ToolTemplate_slug_key" ON "ToolTemplate"("slug");

-- CreateIndex
CREATE INDEX "ToolTemplate_kind_published_idx" ON "ToolTemplate"("kind", "published");

-- CreateIndex
CREATE UNIQUE INDEX "BabyName_normalized_key" ON "BabyName"("normalized");

-- CreateIndex
CREATE INDEX "BabyName_gender_origin_idx" ON "BabyName"("gender", "origin");

-- CreateIndex
CREATE INDEX "BabyNameChoice_userId_pregnancyId_idx" ON "BabyNameChoice"("userId", "pregnancyId");

-- CreateIndex
CREATE UNIQUE INDEX "BabyNameChoice_pregnancyId_userId_nameId_key" ON "BabyNameChoice"("pregnancyId", "userId", "nameId");

-- CreateIndex
CREATE INDEX "ShareCard_pregnancyId_userId_idx" ON "ShareCard"("pregnancyId", "userId");

-- CreateIndex
CREATE INDEX "MedicalQuestion_pregnancyId_appointmentId_answered_idx" ON "MedicalQuestion"("pregnancyId", "appointmentId", "answered");

-- CreateIndex
CREATE UNIQUE INDEX "BellyTimelapse_outputFileId_key" ON "BellyTimelapse"("outputFileId");

-- CreateIndex
CREATE INDEX "BellyTimelapse_status_createdAt_idx" ON "BellyTimelapse"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BellyTimelapse_pregnancyId_userId_idx" ON "BellyTimelapse"("pregnancyId", "userId");

-- CreateIndex
CREATE INDEX "ContractionSession_pregnancyId_userId_startedAt_idx" ON "ContractionSession"("pregnancyId", "userId", "startedAt");

-- CreateIndex
CREATE INDEX "ContractionRecord_sessionId_startedAt_idx" ON "ContractionRecord"("sessionId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Task_pregnancyId_templateItemKey_key" ON "Task"("pregnancyId", "templateItemKey");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PreparationCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparationCategory" ADD CONSTRAINT "PreparationCategory_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BabyNameChoice" ADD CONSTRAINT "BabyNameChoice_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BabyNameChoice" ADD CONSTRAINT "BabyNameChoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BabyNameChoice" ADD CONSTRAINT "BabyNameChoice_nameId_fkey" FOREIGN KEY ("nameId") REFERENCES "BabyName"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareCard" ADD CONSTRAINT "ShareCard_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareCard" ADD CONSTRAINT "ShareCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareCard" ADD CONSTRAINT "ShareCard_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalQuestion" ADD CONSTRAINT "MedicalQuestion_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalQuestion" ADD CONSTRAINT "MedicalQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalQuestion" ADD CONSTRAINT "MedicalQuestion_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BellyTimelapse" ADD CONSTRAINT "BellyTimelapse_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BellyTimelapse" ADD CONSTRAINT "BellyTimelapse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BellyTimelapse" ADD CONSTRAINT "BellyTimelapse_outputFileId_fkey" FOREIGN KEY ("outputFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractionSession" ADD CONSTRAINT "ContractionSession_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractionSession" ADD CONSTRAINT "ContractionSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractionRecord" ADD CONSTRAINT "ContractionRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ContractionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Invariants are enforced even under concurrent requests and offline replays.
ALTER TABLE "ContractionRecord" ADD CONSTRAINT "ContractionRecord_positive_duration" CHECK ("endedAt" IS NULL OR ("endedAt" >= "startedAt" AND "endedAt" <= "startedAt" + INTERVAL '24 hours'));
CREATE UNIQUE INDEX "ContractionRecord_one_open" ON "ContractionRecord" ("sessionId") WHERE "endedAt" IS NULL;
CREATE UNIQUE INDEX "ContractionSession_one_active" ON "ContractionSession" ("pregnancyId","userId") WHERE "status" = 'ACTIVE';
ALTER TABLE "BabyNameChoice" ADD CONSTRAINT "BabyNameChoice_vote_check" CHECK ("vote" IS NULL OR "vote" IN ('LIKE','NO','FAVORITE','PASS'));
ALTER TABLE "BellyTimelapse" ADD CONSTRAINT "BellyTimelapse_progress_check" CHECK ("progress" BETWEEN 0 AND 100);
ALTER TABLE "ContractionSession" ADD CONSTRAINT "ContractionSession_status_check" CHECK ("status" IN ('ACTIVE','PAUSED','FINISHED'));
