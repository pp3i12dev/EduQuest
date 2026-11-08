-- Permisos por rol, independientes para correo y teléfono.
-- Los valores anteriores PRIVATE/STAFF/INSTITUTION se conservan en columnas legacy
-- únicamente por compatibilidad, pero no se utilizan para decidir visibilidad.
-- Comenzar con ambos arrays vacíos evita convertir permisos amplios en otros distintos.
ALTER TABLE "User" ADD COLUMN "directoryEmailRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "directoryPhoneRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
