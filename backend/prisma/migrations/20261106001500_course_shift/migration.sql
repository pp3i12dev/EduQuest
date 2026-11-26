-- Nueva dimensión de cursada, sin duplicar carreras ni perder inscripciones.
-- Los cursos antiguos quedan con NULL hasta que administración determine el turno real.
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "shift" "Shift";
-- Único solamente entre cursos con turno definido. Los antiguos NULL no se tocan.
-- COALESCE asegura la regla incluso para cursos generales sin carrera.
CREATE UNIQUE INDEX IF NOT EXISTS "Course_institution_career_name_year_shift_unique"
  ON "Course" ("institutionId", COALESCE("careerId", -1), LOWER("nombre"), "academicYear", "shift")
  WHERE "shift" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Course_institutionId_careerId_academicYear_shift_idx"
  ON "Course"("institutionId", "careerId", "academicYear", "shift");
