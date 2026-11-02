-- EduQuest: la numeración de temas empieza en 1 y es continua por unidad didáctica.
-- No se eliminan registros. La posición previa (y el ID) determinan el orden relativo.
-- Prisma Migrate aplica esta migración con el historial de la rama correspondiente.

ALTER TABLE "Topic" ALTER COLUMN "position" SET DEFAULT 1;

WITH ordered AS (
  SELECT "id",
         ROW_NUMBER() OVER (PARTITION BY "unitId" ORDER BY "position" ASC, "id" ASC)::integer AS new_position
  FROM "Topic"
)
UPDATE "Topic" t
SET "position" = ordered.new_position
FROM ordered
WHERE t."id" = ordered."id"
  AND t."position" IS DISTINCT FROM ordered.new_position;
