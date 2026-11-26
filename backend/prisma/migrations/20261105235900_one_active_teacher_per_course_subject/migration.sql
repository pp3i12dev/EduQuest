-- Una materia (Subject) de un curso (Course) admite UN docente vigente.
-- No se limita al docente a una sola materia o a un solo curso.
-- No se eliminan asignaciones históricas (isActive = false).
-- Si hay duplicados previos, abortamos: la elección del responsable es administrativa.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "TeacherSubject"
        WHERE "isActive" = TRUE
        GROUP BY "courseId", "subjectId"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Hay materias con varios docentes activos en un mismo curso. Ejecutá backend/scripts/diagnosticar_docentes_duplicados.sql, resolvé las asignaciones y repetí migrate deploy.';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherSubject_one_active_per_course_subject_idx"
    ON "TeacherSubject" ("courseId", "subjectId")
    WHERE "isActive" = TRUE;
