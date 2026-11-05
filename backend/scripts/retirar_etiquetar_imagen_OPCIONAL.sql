-- EJECUTAR SOLO DESPUÉS DE BACKUP EN UNA BASE DE PRUEBAS.
-- La despublicación conserva Activity y GameAttempt (historial y notas).
BEGIN;
UPDATE "Activity"
SET "status" = 'INACTIVE', "isPublished" = false, "publishedAt" = NULL
WHERE "gameType" = 'image_label' AND "status" <> 'INACTIVE';
COMMIT;
-- Comprobar: SELECT id, title, status FROM "Activity" WHERE "gameType"='image_label';
