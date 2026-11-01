-- CreateEnum
CREATE TYPE "EarlyNoticeType" AS ENUM ('ABSENCE', 'LATE_ARRIVAL');

-- CreateEnum
CREATE TYPE "EarlyNoticeStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EducationLevel" ADD VALUE 'TERCIARIO';
ALTER TYPE "EducationLevel" ADD VALUE 'UNIVERSITARIO';
ALTER TYPE "EducationLevel" ADD VALUE 'POSTGRADO';
ALTER TYPE "EducationLevel" ADD VALUE 'CURSO';
ALTER TYPE "EducationLevel" ADD VALUE 'OTRO';

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_institutionId_fkey";

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "status" "ActivityStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "telefono" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telefono" TEXT,
ALTER COLUMN "institutionId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "EarlyNotice" (
    "id" SERIAL NOT NULL,
    "type" "EarlyNoticeType" NOT NULL,
    "status" "EarlyNoticeStatus" NOT NULL DEFAULT 'PENDING',
    "classDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "institutionId" INTEGER NOT NULL,
    "teacherSubjectId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "scheduleId" INTEGER,
    "day" "ScheduleDay" NOT NULL,
    "shift" "Shift" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "teacherUserId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "confirmedById" INTEGER,

    CONSTRAINT "EarlyNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSubjectContent" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherSubjectId" INTEGER NOT NULL,

    CONSTRAINT "TeacherSubjectContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EarlyNotice_institutionId_classDate_status_idx" ON "EarlyNotice"("institutionId", "classDate", "status");

-- CreateIndex
CREATE INDEX "EarlyNotice_teacherUserId_status_idx" ON "EarlyNotice"("teacherUserId", "status");

-- CreateIndex
CREATE INDEX "EarlyNotice_courseId_classDate_idx" ON "EarlyNotice"("courseId", "classDate");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Invitation_institutionId_createdAt_idx" ON "Invitation"("institutionId", "createdAt");

-- AddForeignKey
ALTER TABLE "EarlyNotice" ADD CONSTRAINT "EarlyNotice_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyNotice" ADD CONSTRAINT "EarlyNotice_teacherSubjectId_fkey" FOREIGN KEY ("teacherSubjectId") REFERENCES "TeacherSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyNotice" ADD CONSTRAINT "EarlyNotice_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyNotice" ADD CONSTRAINT "EarlyNotice_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyNotice" ADD CONSTRAINT "EarlyNotice_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "SubjectSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyNotice" ADD CONSTRAINT "EarlyNotice_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyNotice" ADD CONSTRAINT "EarlyNotice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyNotice" ADD CONSTRAINT "EarlyNotice_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyNotice" ADD CONSTRAINT "EarlyNotice_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubjectContent" ADD CONSTRAINT "TeacherSubjectContent_teacherSubjectId_fkey" FOREIGN KEY ("teacherSubjectId") REFERENCES "TeacherSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
