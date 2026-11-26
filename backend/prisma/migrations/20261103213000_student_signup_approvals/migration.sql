-- No se cambia isActive ni se clasifican retrospectivamente cuentas existentes.
-- Una cuenta anterior conserva signupStatus=NULL hasta su eventual revisión manual.
CREATE TYPE "StudentSignupStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "User"
  ADD COLUMN "signupStatus" "StudentSignupStatus",
  ADD COLUMN "signupReviewedAt" TIMESTAMP(3),
  ADD COLUMN "signupReviewedById" INTEGER,
  ADD COLUMN "signupReviewReason" TEXT;
CREATE INDEX "User_institutionId_signupStatus_idx" ON "User"("institutionId", "signupStatus");
ALTER TYPE "NotificationType" ADD VALUE 'STUDENT_REGISTRATION_REQUEST';
ALTER TABLE "Notification" ADD COLUMN "signupUserId" INTEGER;
CREATE UNIQUE INDEX "Notification_userId_signupUserId_type_revision_key" ON "Notification"("userId", "signupUserId", "type", "revision");
CREATE INDEX "Notification_signupUserId_idx" ON "Notification"("signupUserId");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_signupUserId_fkey"
  FOREIGN KEY ("signupUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
