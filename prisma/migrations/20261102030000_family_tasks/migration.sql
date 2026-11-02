ALTER TABLE "PregnancyMember" ADD COLUMN "tasks" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Invitation" ADD COLUMN "tasks" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "Task" ("id" TEXT NOT NULL,"pregnancyId" TEXT NOT NULL,"title" TEXT NOT NULL,"dueDate" DATE,"completed" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Task_pkey" PRIMARY KEY("id"));
CREATE INDEX "Task_pregnancyId_completed_idx" ON "Task"("pregnancyId","completed");
ALTER TABLE "Task" ADD CONSTRAINT "Task_pregnancyId_fkey" FOREIGN KEY("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
