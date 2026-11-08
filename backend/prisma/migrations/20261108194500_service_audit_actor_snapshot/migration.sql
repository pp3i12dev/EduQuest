-- Conserva la identidad del responsable incluso si luego se modifica o borra su cuenta.
ALTER TABLE "ServiceConfigAudit" ADD COLUMN "actorName" TEXT;
ALTER TABLE "ServiceConfigAudit" ADD COLUMN "actorEmail" TEXT;
ALTER TABLE "ServiceConfigAudit" ADD COLUMN "actorRole" TEXT;
-- Completa las filas antiguas disponibles sin modificar fechas ni acciones.
UPDATE "ServiceConfigAudit" AS audit SET
  "actorName" = CONCAT_WS(' ', person."firstName", person."lastName"),
  "actorEmail" = person."email",
  "actorRole" = CASE WHEN person."isSuperAdmin" THEN 'SUPER_ADMIN' ELSE NULL END
FROM "User" AS person WHERE person."id" = audit."actorId" AND audit."actorName" IS NULL;
