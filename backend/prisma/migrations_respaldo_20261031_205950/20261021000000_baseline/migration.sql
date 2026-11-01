-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('JARDIN', 'PRIMARIO', 'SECUNDARIO', 'TERCIARIO', 'UNIVERSITARIO', 'POSTGRADO', 'CURSO', 'OTRO');

-- CreateEnum
CREATE TYPE "ScheduleDay" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO');

-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('MANANA', 'TARDE', 'NOCHE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'JUSTIFIED', 'LATE');

-- CreateEnum
CREATE TYPE "InstitutionEventScope" AS ENUM ('INSTITUTION', 'CAREERS', 'COURSES');

-- CreateEnum
CREATE TYPE "InstitutionCommunicationKind" AS ENUM ('EVENT', 'SUSPENSION');

-- CreateEnum
CREATE TYPE "EarlyNoticeType" AS ENUM ('ABSENCE', 'LATE_ARRIVAL', 'ATTENDANCE_CONFIRMED', 'VIRTUAL_SYNCHRONOUS', 'VIRTUAL_ASYNCHRONOUS');

-- CreateEnum
CREATE TYPE "EarlyNoticeStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InvitedRole" AS ENUM ('DIRECTOR', 'PRECEPTOR', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EARLY_NOTICE_PENDING', 'EARLY_NOTICE_CONFIRMED', 'EARLY_NOTICE_REJECTED', 'EARLY_NOTICE_UPDATED', 'EARLY_NOTICE_CANCELLED', 'EVENT_CREATED', 'EVENT_UPDATED', 'EVENT_CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Career" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "level" "EducationLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "institutionId" INTEGER NOT NULL,

    CONSTRAINT "Career_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL DEFAULT 2026,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "institutionId" INTEGER NOT NULL,
    "careerId" INTEGER,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "institutionId" INTEGER NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSubject" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TeacherSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentCourse" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,

    CONSTRAINT "StudentCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectSchedule" (
    "id" SERIAL NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "day" "ScheduleDay" NOT NULL,
    "shift" "Shift" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubjectSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AttendanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" INTEGER NOT NULL,
    "preceptorId" INTEGER NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

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
    "kind" "InstitutionCommunicationKind" NOT NULL DEFAULT 'EVENT',
    "locationType" TEXT,
    "venueName" TEXT,
    "venueAddress" TEXT,
    "suspensionReason" TEXT,
    "affectedActivities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affectedShifts" "Shift"[] DEFAULT ARRAY[]::"Shift"[],
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
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

-- CreateTable
CREATE TABLE "DirectorProfile" (
    "id" SERIAL NOT NULL,
    "position" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "DirectorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyNotice" (
    "id" SERIAL NOT NULL,
    "type" "EarlyNoticeType" NOT NULL,
    "status" "EarlyNoticeStatus" NOT NULL DEFAULT 'PENDING',
    "classDate" DATE NOT NULL,
    "estimatedArrivalTime" TEXT,
    "reason" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "periodStart" DATE,
    "periodEnd" DATE,
    "virtualMeetingUrl" TEXT,
    "virtualInstructions" TEXT,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
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
CREATE TABLE "Activity" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "gameType" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 100,
    "status" "ActivityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherId" INTEGER NOT NULL,
    "teacherSubjectId" INTEGER,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAttempt" (
    "id" SERIAL NOT NULL,
    "score" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "timeInSec" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activityId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,

    CONSTRAINT "GameAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvatarConfig" (
    "id" SERIAL NOT NULL,
    "configJson" JSONB NOT NULL,
    "studentId" INTEGER NOT NULL,

    CONSTRAINT "AvatarConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "StoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentInventory" (
    "id" SERIAL NOT NULL,
    "boughtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,

    CONSTRAINT "StudentInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "cue" TEXT NOT NULL,
    "distrito" TEXT NOT NULL DEFAULT 'La Plata',
    "provincia" TEXT NOT NULL DEFAULT 'Buenos Aires',
    "direccion" TEXT,
    "telefono" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" SERIAL NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "role" "InvitedRole" NOT NULL,
    "token" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedById" INTEGER NOT NULL,
    "institutionId" INTEGER NOT NULL,
    "courseId" INTEGER,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "earlyNoticeId" INTEGER,
    "institutionEventId" INTEGER,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" SERIAL NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "recipient" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "notificationId" INTEGER NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreceptorProfile" (
    "id" SERIAL NOT NULL,
    "legajoPreceptor" TEXT NOT NULL,
    "shift" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "PreceptorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" SERIAL NOT NULL,
    "legajoStudent" TEXT NOT NULL,
    "puntosTotales" INTEGER NOT NULL DEFAULT 0,
    "nivelActual" INTEGER NOT NULL DEFAULT 1,
    "monedas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "id" SERIAL NOT NULL,
    "legajoTeacher" TEXT NOT NULL,
    "specialty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "dni" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "institutionId" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "TeacherSubject_subjectId_courseId_isActive_idx" ON "TeacherSubject"("subjectId", "courseId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSubject_teacherId_subjectId_courseId_key" ON "TeacherSubject"("teacherId", "subjectId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCourse_studentId_courseId_key" ON "StudentCourse"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "SubjectSchedule_courseId_subjectId_idx" ON "SubjectSchedule"("courseId", "subjectId");

-- CreateIndex
CREATE INDEX "SubjectSchedule_courseId_day_idx" ON "SubjectSchedule"("courseId", "day");

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
CREATE UNIQUE INDEX "DirectorProfile_userId_key" ON "DirectorProfile"("userId");

-- CreateIndex
CREATE INDEX "EarlyNotice_institutionId_classDate_status_idx" ON "EarlyNotice"("institutionId", "classDate", "status");

-- CreateIndex
CREATE INDEX "EarlyNotice_teacherUserId_status_idx" ON "EarlyNotice"("teacherUserId", "status");

-- CreateIndex
CREATE INDEX "EarlyNotice_courseId_classDate_idx" ON "EarlyNotice"("courseId", "classDate");

-- CreateIndex
CREATE INDEX "EarlyNotice_institutionId_deletedAt_idx" ON "EarlyNotice"("institutionId", "deletedAt");

-- CreateIndex
CREATE INDEX "Activity_teacherSubjectId_idx" ON "Activity"("teacherSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "AvatarConfig_studentId_key" ON "AvatarConfig"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentInventory_studentId_itemId_key" ON "StudentInventory"("studentId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_cue_key" ON "Institution"("cue");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_institutionId_createdAt_idx" ON "Invitation"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_earlyNoticeId_idx" ON "Notification"("earlyNoticeId");

-- CreateIndex
CREATE INDEX "Notification_institutionEventId_idx" ON "Notification"("institutionEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_earlyNoticeId_type_revision_key" ON "Notification"("userId", "earlyNoticeId", "type", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_institutionEventId_type_revision_key" ON "Notification"("userId", "institutionEventId", "type", "revision");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_createdAt_idx" ON "NotificationDelivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_providerMessageId_idx" ON "NotificationDelivery"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_notificationId_channel_key" ON "NotificationDelivery"("notificationId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "PreceptorProfile_legajoPreceptor_key" ON "PreceptorProfile"("legajoPreceptor");

-- CreateIndex
CREATE UNIQUE INDEX "PreceptorProfile_userId_key" ON "PreceptorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_legajoStudent_key" ON "StudentProfile"("legajoStudent");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_legajoTeacher_key" ON "TeacherProfile"("legajoTeacher");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_dni_key" ON "User"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "Career" ADD CONSTRAINT "Career_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "Career"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCourse" ADD CONSTRAINT "StudentCourse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCourse" ADD CONSTRAINT "StudentCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectSchedule" ADD CONSTRAINT "SubjectSchedule_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectSchedule" ADD CONSTRAINT "SubjectSchedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_preceptorId_fkey" FOREIGN KEY ("preceptorId") REFERENCES "PreceptorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "DirectorProfile" ADD CONSTRAINT "DirectorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_teacherSubjectId_fkey" FOREIGN KEY ("teacherSubjectId") REFERENCES "TeacherSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvatarConfig" ADD CONSTRAINT "AvatarConfig_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInventory" ADD CONSTRAINT "StudentInventory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInventory" ADD CONSTRAINT "StudentInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StoreItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_earlyNoticeId_fkey" FOREIGN KEY ("earlyNoticeId") REFERENCES "EarlyNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_institutionEventId_fkey" FOREIGN KEY ("institutionEventId") REFERENCES "InstitutionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreceptorProfile" ADD CONSTRAINT "PreceptorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubjectContent" ADD CONSTRAINT "TeacherSubjectContent_teacherSubjectId_fkey" FOREIGN KEY ("teacherSubjectId") REFERENCES "TeacherSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
