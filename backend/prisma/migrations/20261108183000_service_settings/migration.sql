-- No se importa ninguna contraseña SMTP/Gemini ni clave VAPID del entorno antiguo.
-- Configurar servicios desde React después de aplicar la migración.
CREATE TABLE "InstitutionServiceConfig" (
 "institutionId" INTEGER NOT NULL,
 "smtpProvider" TEXT NOT NULL DEFAULT 'gmail',
 "smtpUser" TEXT,
 "smtpPasswordEncrypted" TEXT,
 "smtpFromName" TEXT,
 "smtpEnabled" BOOLEAN NOT NULL DEFAULT false,
 "geminiKeyEncrypted" TEXT,
 "geminiModel" TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
 "geminiEnabled" BOOLEAN NOT NULL DEFAULT false,
 "updatedById" INTEGER,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "InstitutionServiceConfig_pkey" PRIMARY KEY ("institutionId")
);
ALTER TABLE "InstitutionServiceConfig" ADD CONSTRAINT "InstitutionServiceConfig_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "WebPushServerConfig" (
 "id" INTEGER NOT NULL DEFAULT 1,
 "publicKey" TEXT NOT NULL,
 "privateKeyEncrypted" TEXT NOT NULL,
 "subject" TEXT NOT NULL,
 "enabled" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "WebPushServerConfig_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ServiceConfigAudit" (
 "id" SERIAL NOT NULL,
 "actorId" INTEGER NOT NULL,
 "institutionId" INTEGER,
 "action" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ServiceConfigAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ServiceConfigAudit_institutionId_createdAt_idx" ON "ServiceConfigAudit"("institutionId", "createdAt");
CREATE INDEX "ServiceConfigAudit_actorId_createdAt_idx" ON "ServiceConfigAudit"("actorId", "createdAt");
