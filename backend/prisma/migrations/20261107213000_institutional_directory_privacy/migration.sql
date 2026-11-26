-- No modifica las tablas pedagógicas ni los contratos de Unity.
CREATE TYPE "DirectoryVisibility" AS ENUM ('PRIVATE', 'STAFF', 'INSTITUTION');
ALTER TABLE "User" ADD COLUMN "directoryEmailVisibility" "DirectoryVisibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "User" ADD COLUMN "directoryPhoneVisibility" "DirectoryVisibility" NOT NULL DEFAULT 'PRIVATE';
