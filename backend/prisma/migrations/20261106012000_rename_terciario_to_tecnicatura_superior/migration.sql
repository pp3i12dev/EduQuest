-- Cambiar el nombre del valor preserva todos los registros de Career
-- y sus relaciones. Ejecutar con prisma migrate deploy sobre PostgreSQL.
ALTER TYPE "EducationLevel" RENAME VALUE 'TERCIARIO' TO 'TECNICATURA_SUPERIOR';
