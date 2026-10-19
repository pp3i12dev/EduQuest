-- PROPUESTA: no ejecutar en production sin snapshot y prueba de diff de Prisma.
-- Diseñado para la estructura de InstitutionEvent del proyecto(2).rar.
CREATE TYPE "InstitutionCommunicationKind" AS ENUM ('EVENT', 'SUSPENSION');
ALTER TABLE "InstitutionEvent"
  ADD COLUMN "kind" "InstitutionCommunicationKind" NOT NULL DEFAULT 'EVENT',
  ADD COLUMN "suspensionReason" TEXT,
  ADD COLUMN "affectedActivities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "affectedShifts" "Shift"[] NOT NULL DEFAULT ARRAY[]::"Shift"[],
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancellationReason" TEXT;
