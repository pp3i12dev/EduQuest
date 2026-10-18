
-- EDUQUEST
-- Auditoría previa a migraciones
-- Solo lectura: no modifica la base de datos.

-- 1. Estado del historial Prisma
SELECT
    migration_name,
    started_at,
    finished_at,
    rolled_back_at,
    applied_steps_count,
    LEFT(logs, 500) AS error_detail
FROM public."_prisma_migrations"
ORDER BY started_at;

-- 2. Cursos que todavía no tienen carrera
SELECT
    c.id AS "courseId",
    c.nombre AS curso,
    c."academicYear",
    c."institutionId",
    i.nombre AS institucion,
    (
        SELECT COUNT(*)
        FROM public."Career" ca
        WHERE ca."institutionId" = c."institutionId"
    ) AS carreras_disponibles
FROM public."Course" c
JOIN public."Institution" i
    ON i.id = c."institutionId"
WHERE c."careerId" IS NULL
ORDER BY c."institutionId", c.id;

-- 3. Cursos cuya carrera pertenece a otra institución
SELECT
    c.id AS "courseId",
    c.nombre AS curso,
    c."institutionId" AS institucion_curso,
    ca.id AS "careerId",
    ca.nombre AS carrera,
    ca."institutionId" AS institucion_carrera
FROM public."Course" c
JOIN public."Career" ca
    ON ca.id = c."careerId"
WHERE c."institutionId" <> ca."institutionId";

-- 4. Materias asignadas a cursos de otra institución
SELECT
    ts.id AS "teacherSubjectId",
    s.nombre AS materia,
    s."institutionId" AS institucion_materia,
    c.nombre AS curso,
    c."institutionId" AS institucion_curso
FROM public."TeacherSubject" ts
JOIN public."Subject" s
    ON s.id = ts."subjectId"
JOIN public."Course" c
    ON c.id = ts."courseId"
WHERE s."institutionId" <> c."institutionId";

-- 5. Alumnos matriculados en instituciones diferentes
SELECT
    sc.id AS "studentCourseId",
    u.id AS "userId",
    u."firstName",
    u."lastName",
    u."institutionId" AS institucion_alumno,
    c."institutionId" AS institucion_curso
FROM public."StudentCourse" sc
JOIN public."StudentProfile" sp
    ON sp.id = sc."studentId"
JOIN public."User" u
    ON u.id = sp."userId"
JOIN public."Course" c
    ON c.id = sc."courseId"
WHERE u."institutionId" <> c."institutionId";

-- 6. Docentes asignados fuera de su institución
SELECT
    ts.id AS "teacherSubjectId",
    u.id AS "userId",
    u."firstName",
    u."lastName",
    u."institutionId" AS institucion_docente,
    c."institutionId" AS institucion_curso
FROM public."TeacherSubject" ts
JOIN public."TeacherProfile" tp
    ON tp.id = ts."teacherId"
JOIN public."User" u
    ON u.id = tp."userId"
JOIN public."Course" c
    ON c.id = ts."courseId"
WHERE u."institutionId" <> c."institutionId";

-- 7. Invitaciones existentes y su institución de origen
SELECT
    inv.id,
    inv.email,
    inv.role,
    inv."isUsed",
    inv."courseId",
    inv."invitedById",
    u."institutionId" AS institucion_invitador,
    c."institutionId" AS institucion_curso
FROM public."Invitation" inv
JOIN public."User" u
    ON u.id = inv."invitedById"
LEFT JOIN public."Course" c
    ON c.id = inv."courseId"
ORDER BY inv.id;

-- 8. Confirmar columnas críticas existentes
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'Subject' AND column_name = 'isActive')
    OR
    (table_name = 'Course' AND column_name = 'careerId')
    OR
    (table_name = 'User'
      AND column_name IN (
        'institutionId',
        'telefono',
        'isSuperAdmin'
      ))
    OR
    (table_name = 'Invitation'
      AND column_name IN (
        'institutionId',
        'telefono'
      ))
  )
ORDER BY table_name, column_name;
