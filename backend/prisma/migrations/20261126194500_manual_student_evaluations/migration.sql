CREATE TABLE "ManualEvaluation" (
    "id" SERIAL NOT NULL,
    "grade" DECIMAL(4,2) NOT NULL,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" INTEGER NOT NULL,
    "teacherSubjectId" INTEGER NOT NULL,

    CONSTRAINT "ManualEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManualEvaluation_studentId_createdAt_idx"
    ON "ManualEvaluation"("studentId", "createdAt");
CREATE INDEX "ManualEvaluation_teacherSubjectId_studentId_idx"
    ON "ManualEvaluation"("teacherSubjectId", "studentId");

ALTER TABLE "ManualEvaluation"
    ADD CONSTRAINT "ManualEvaluation_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualEvaluation"
    ADD CONSTRAINT "ManualEvaluation_teacherSubjectId_fkey"
    FOREIGN KEY ("teacherSubjectId") REFERENCES "TeacherSubject"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
