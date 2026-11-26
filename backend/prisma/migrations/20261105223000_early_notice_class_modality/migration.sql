-- Registrar la modalidad de cada clase como una instantánea, independiente de futuros cambios del horario.
ALTER TABLE "EarlyNoticeClass" ADD COLUMN "modality" "ClassModality" NOT NULL DEFAULT 'PRESENCIAL';
UPDATE "EarlyNoticeClass" AS nc
SET "modality" = sc."modality"
FROM "SubjectSchedule" AS sc
WHERE nc."scheduleId" = sc."id";
