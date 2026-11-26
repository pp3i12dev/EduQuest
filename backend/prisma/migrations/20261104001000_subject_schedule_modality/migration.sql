-- Cada encuentro semanal tiene una modalidad propia.
-- Los horarios anteriores quedan como PRESENCIAL para no perder ni alterar registros.
CREATE TYPE "ClassModality" AS ENUM ('PRESENCIAL', 'VIRTUAL_SINCRONA', 'VIRTUAL_ASINCRONA');
ALTER TABLE "SubjectSchedule"
    ADD COLUMN "modality" "ClassModality" NOT NULL DEFAULT 'PRESENCIAL';
