-- Contactos institucionales opcionales independientes de la cuenta de acceso.
-- Los registros existentes reciben sus valores actuales; no se modifican permisos.
ALTER TABLE "User" ADD COLUMN "directoryContactEmail" TEXT;
ALTER TABLE "User" ADD COLUMN "directoryContactPhone" TEXT;
UPDATE "User" SET "directoryContactEmail" = "email", "directoryContactPhone" = "telefono";
