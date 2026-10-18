-- CreateEnum
CREATE TYPE "InstitutionEventScope" AS ENUM ('INSTITUTION', 'CAREERS', 'COURSES');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EarlyNoticeType" ADD VALUE 'ATTENDANCE_CONFIRMED';
ALTER TYPE "EarlyNoticeType" ADD VALUE 'VIRTUAL_SYNCHRONOUS';
ALTER TYPE "EarlyNoticeType" ADD VALUE 'VIRTUAL_ASYNCHRONOUS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'EVENT_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_CANCELLED';

-- DropIndex
DROP INDEX "Notification_userId_earlyNoticeId_type_key";

-- AlterTable
ALTER TABLE "EarlyNotice" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "periodEnd" DATE,
ADD COLUMN     "periodStart" DATE,
ADD COLUMN     "virtualInstructions" TEXT,
ADD COLUMN     "virtualMeetingUrl" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "institutionEventId" INTEGER,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "earlyNoticeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "EarlyNoticeClass" (
    "id" SERIAL NOT NULL,
    "earlyNoticeId" INTEGER NOT NULL,
    "teacherSubjectId" INTEGER NOT NULL,
    "scheduleId" INTEGER,
    "classDate" DATE NOT NULL,
    "day" "ScheduleDay" NOT NULL,
    "shift" "Shift" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "EarlyNoticeClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyNoticeRevision" (
    "id" SERIAL NOT NULL,
    "earlyNoticeId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "EarlyNoticeRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "scope" "InstitutionEventScope" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "institutionId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER,

    CONSTRAINT "InstitutionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionEventAudience" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "InstitutionEventAudience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionEventCareer" (
    "eventId" INTEGER NOT NULL,
    "careerId" INTEGER NOT NULL,

    CONSTRAINT "InstitutionEventCareer_pkey" PRIMARY KEY ("eventId","careerId")
);

-- CreateTable
CREATE TABLE "InstitutionEventCourse" (
    "eventId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,

    CONSTRAINT "InstitutionEventCourse_pkey" PRIMARY KEY ("eventId","courseId")
);

-- CreateTable
CREATE TABLE "InstitutionEventRevision" (
    "id" SERIAL NOT NULL,
    "institutionEventId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "InstitutionEventRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EarlyNoticeClass_teacherSubjectId_classDate_idx" ON "EarlyNoticeClass"("teacherSubjectId", "classDate");

-- CreateIndex
CREATE INDEX "EarlyNoticeClass_classDate_idx" ON "EarlyNoticeClass"("classDate");

-- CreateIndex
CREATE UNIQUE INDEX "EarlyNoticeClass_earlyNoticeId_teacherSubjectId_classDate_s_key" ON "EarlyNoticeClass"("earlyNoticeId", "teacherSubjectId", "classDate", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "EarlyNoticeRevision_createdAt_idx" ON "EarlyNoticeRevision"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EarlyNoticeRevision_earlyNoticeId_version_key" ON "EarlyNoticeRevision"("earlyNoticeId", "version");

-- CreateIndex
CREATE INDEX "InstitutionEvent_institutionId_startsAt_idx" ON "InstitutionEvent"("institutionId", "startsAt");

-- CreateIndex
CREATE INDEX "InstitutionEvent_institutionId_endsAt_idx" ON "InstitutionEvent"("institutionId", "endsAt");

-- CreateIndex
CREATE INDEX "InstitutionEvent_institutionId_deletedAt_idx" ON "InstitutionEvent"("institutionId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionEventAudience_eventId_role_key" ON "InstitutionEventAudience"("eventId", "role");

-- CreateIndex
CREATE INDEX "InstitutionEventRevision_createdAt_idx" ON "InstitutionEventRevision"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionEventRevision_institutionEventId_version_key" ON "InstitutionEventRevision"("institutionEventId", "version");

-- CreateIndex
CREATE INDEX "EarlyNotice_institutionId_deletedAt_idx" ON "EarlyNotice"("institutionId", "deletedAt");

-- CreateIndex
CREATE INDEX "Notification_institutionEventId_idx" ON "Notification"("institutionEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_earlyNoticeId_type_revision_key" ON "Notification"("userId", "earlyNoticeId", "type", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_institutionEventId_type_revision_key" ON "Notification"("userId", "institutionEventId", "type", "revision");

-- AddForeignKey
ALTER TABLE "EarlyNoticeClass" ADD CONSTRAINT "EarlyNoticeClass_earlyNoticeId_fkey" FOREIGN KEY ("earlyNoticeId") REFERENCES "EarlyNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyNoticeClass" ADD CONSTRAINT "EarlyNoticeClass_teacherSubjectId_fkey" FOREIGN KEY ("teacherSubjectId") REFERENCES "TeacherSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyNoticeClass" ADD CONSTRAINT "EarlyNoticeClass_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "SubjectSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyNoticeRevision" ADD CONSTRAINT "EarlyNoticeRevision_earlyNoticeId_fkey" FOREIGN KEY ("earlyNoticeId") REFERENCES "EarlyNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyNoticeRevision" ADD CONSTRAINT "EarlyNoticeRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionEvent" ADD CONSTRAINT "InstitutionEvent_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionEvent" ADD CONSTRAINT "InstitutionEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionEvent" ADD CONSTRAINT "InstitutionEvent_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionEventAudience" ADD CONSTRAINT "InstitutionEventAudience_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "InstitutionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionEventCareer" ADD CONSTRAINT "InstitutionEventCareer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "InstitutionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionEventCareer" ADD CONSTRAINT "InstitutionEventCareer_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "Career"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionEventCourse" ADD CONSTRAINT "InstitutionEventCourse_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "InstitutionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionEventCourse" ADD CONSTRAINT "InstitutionEventCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionEventRevision" ADD CONSTRAINT "InstitutionEventRevision_institutionEventId_fkey" FOREIGN KEY ("institutionEventId") REFERENCES "InstitutionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionEventRevision" ADD CONSTRAINT "InstitutionEventRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_institutionEventId_fkey" FOREIGN KEY ("institutionEventId") REFERENCES "InstitutionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
