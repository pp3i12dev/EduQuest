ALTER TABLE "Activity" ADD COLUMN "teacherSubjectId" INTEGER;

INSERT INTO "Activity" ("title", "gameType", "content", "teacherId", "teacherSubjectId")
SELECT
  subject."nombre",
  CASE teacher_subject."gameId"
    WHEN 'pig-game' THEN 'pig_game'
    ELSE teacher_subject."gameId"
  END,
  '{}'::jsonb,
  teacher_subject."teacherId",
  teacher_subject."id"
FROM "TeacherSubject" AS teacher_subject
JOIN "Subject" AS subject ON subject."id" = teacher_subject."subjectId"
WHERE teacher_subject."gameId" IS NOT NULL
  AND btrim(teacher_subject."gameId") <> '';

ALTER TABLE "TeacherSubject" DROP COLUMN IF EXISTS "gameId";

CREATE INDEX "Activity_teacherSubjectId_idx" ON "Activity"("teacherSubjectId");

ALTER TABLE "Activity"
ADD CONSTRAINT "Activity_teacherSubjectId_fkey"
FOREIGN KEY ("teacherSubjectId") REFERENCES "TeacherSubject"("id")
ON DELETE SET NULL ON UPDATE CASCADE;