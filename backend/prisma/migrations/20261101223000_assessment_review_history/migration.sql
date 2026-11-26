-- Entrega 4: conserva intentos históricos; los nuevos almacenan detalles de corrección.
ALTER TABLE "GameAttempt"
  ADD COLUMN "answerReview" JSONB,
  ADD COLUMN "earnedPoints" INTEGER,
  ADD COLUMN "subjectNameSnapshot" TEXT,
  ADD COLUMN "courseNameSnapshot" TEXT,
  ADD COLUMN "unitNameSnapshot" TEXT,
  ADD COLUMN "topicNameSnapshot" TEXT,
  ADD COLUMN "activityNameSnapshot" TEXT,
  ADD COLUMN "teacherSubjectIdSnapshot" INTEGER,
  ADD COLUMN "studentHiddenAt" TIMESTAMP(3),
  ADD COLUMN "teacherArchivedAt" TIMESTAMP(3);
CREATE INDEX "GameAttempt_teacherSubjectIdSnapshot_createdAt_idx" ON "GameAttempt"("teacherSubjectIdSnapshot", "createdAt");
CREATE INDEX "GameAttempt_studentId_createdAt_idx" ON "GameAttempt"("studentId", "createdAt");
