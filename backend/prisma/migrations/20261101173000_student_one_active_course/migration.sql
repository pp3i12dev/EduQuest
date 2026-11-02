-- La matrícula StudentCourse representa la asignación ACTUAL, no el historial anual.
-- IMPORTANTE: ejecutar antes la comprobación SQL de duplicados de LEEME_ENTREGA_1.md.
-- Si existen alumnos con más de una matrícula, resolver el conflicto con administración.
-- No eliminar automáticamente matrículas: se conservarían notas pero podría perderse el vínculo de curso.
CREATE UNIQUE INDEX "StudentCourse_studentId_key" ON "StudentCourse"("studentId");
