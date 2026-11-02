CREATE TABLE "EntryAttachment" ("id" TEXT NOT NULL,"entryId" TEXT NOT NULL,"fileId" TEXT NOT NULL,CONSTRAINT "EntryAttachment_pkey" PRIMARY KEY("id"));
CREATE UNIQUE INDEX "EntryAttachment_fileId_key" ON "EntryAttachment"("fileId");
CREATE INDEX "EntryAttachment_entryId_idx" ON "EntryAttachment"("entryId");
ALTER TABLE "EntryAttachment" ADD CONSTRAINT "EntryAttachment_entryId_fkey" FOREIGN KEY("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntryAttachment" ADD CONSTRAINT "EntryAttachment_fileId_fkey" FOREIGN KEY("fileId") REFERENCES "UploadedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
