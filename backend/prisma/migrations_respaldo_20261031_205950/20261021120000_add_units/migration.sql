-- CreateTable
CREATE TABLE "Unit" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teacherSubjectId" INTEGER NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitActivity" (
    "id" SERIAL NOT NULL,
    "unitId" INTEGER NOT NULL,
    "activityId" INTEGER NOT NULL,

    CONSTRAINT "UnitActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Unit_teacherSubjectId_idx" ON "Unit"("teacherSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitActivity_unitId_activityId_key" ON "UnitActivity"("unitId", "activityId");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_teacherSubjectId_fkey" FOREIGN KEY ("teacherSubjectId") REFERENCES "TeacherSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitActivity" ADD CONSTRAINT "UnitActivity_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitActivity" ADD CONSTRAINT "UnitActivity_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;