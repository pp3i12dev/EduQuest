
-- EDUQUEST
-- Opciones de carrera para cada curso sin asignar
-- Solo lectura

SELECT
    c.id AS "courseId",
    c.nombre AS curso,
    c."academicYear",
    i.id AS "institutionId",
    i.nombre AS institucion,
    ca.id AS "careerIdDisponible",
    ca.nombre AS carrera_disponible,
    ca.level AS nivel
FROM public."Course" c
JOIN public."Institution" i
    ON i.id = c."institutionId"
LEFT JOIN public."Career" ca
    ON ca."institutionId" = i.id
WHERE c."careerId" IS NULL
ORDER BY
    i.nombre,
    c.nombre,
    ca.nombre;
