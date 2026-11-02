-- Entrega 2: no altera registros previos. Aplicar tras Entrega 1.
CREATE TABLE "Topic" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "unitId" INTEGER NOT NULL,
  CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Topic_unitId_position_idx" ON "Topic"("unitId", "position");
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Activity" ADD COLUMN "topicId" INTEGER;
CREATE INDEX "Activity_topicId_idx" ON "Activity"("topicId");
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StudyMaterial" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "topicId" INTEGER NOT NULL,
  "teacherSubjectId" INTEGER NOT NULL,
  CONSTRAINT "StudyMaterial_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudyMaterial_storageKey_key" ON "StudyMaterial"("storageKey");
CREATE INDEX "StudyMaterial_teacherSubjectId_isPublished_idx" ON "StudyMaterial"("teacherSubjectId", "isPublished");
CREATE INDEX "StudyMaterial_topicId_idx" ON "StudyMaterial"("topicId");
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_teacherSubjectId_fkey"
  FOREIGN KEY ("teacherSubjectId") REFERENCES "TeacherSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
