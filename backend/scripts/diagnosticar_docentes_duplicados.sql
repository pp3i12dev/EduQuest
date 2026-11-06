-- Consulta de solo lectura. Ejecutar contra la base correcta antes de migrate deploy.
-- Cada fila indica más de una asignación ACTIVA para la misma materia y curso.
SELECT
    ts."courseId" AS "courseId",
    c."nombre" AS "curso",
    ts."subjectId" AS "subjectId",
    s."nombre" AS "materia",
    COUNT(*)::integer AS "docentesActivos",
    STRING_AGG(ts."id"::text || ' (teacherId=' || ts."teacherId"::text || ')', ', ' ORDER BY ts."id") AS "asignaciones"
FROM "TeacherSubject" ts
JOIN "Course" c ON c."id" = ts."courseId"
JOIN "Subject" s ON s."id" = ts."subjectId"
WHERE ts."isActive" = TRUE
GROUP BY ts."courseId", c."nombre", ts."subjectId", s."nombre"
HAVING COUNT(*) > 1
ORDER BY c."nombre", s."nombre";
