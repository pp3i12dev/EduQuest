-- CreateIndex
CREATE INDEX "TeacherSubject_subjectId_courseId_isActive_idx" ON "TeacherSubject"("subjectId", "courseId", "isActive");
