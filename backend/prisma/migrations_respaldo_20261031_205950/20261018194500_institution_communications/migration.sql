-- CreateEnum
CREATE TYPE "InstitutionCommunicationKind" AS ENUM ('EVENT', 'SUSPENSION');

-- AlterTable
ALTER TABLE "InstitutionEvent" ADD COLUMN     "affectedActivities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "affectedShifts" "Shift"[] DEFAULT ARRAY[]::"Shift"[],
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "kind" "InstitutionCommunicationKind" NOT NULL DEFAULT 'EVENT',
ADD COLUMN     "suspensionReason" TEXT;

