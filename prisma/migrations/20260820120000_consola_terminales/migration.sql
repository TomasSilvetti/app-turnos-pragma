-- Terminales adoptadas: pestañas de Windows Terminal que el agente local
-- encuentra abiertas y a las que puede tipearles prompts.

CREATE TABLE IF NOT EXISTS "consola_terminales" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "pid" INTEGER NOT NULL,
    "apodo" TEXT NOT NULL DEFAULT '',
    "titulo" TEXT NOT NULL DEFAULT '',
    "pantalla" TEXT NOT NULL DEFAULT '',
    "viva" BOOLEAN NOT NULL DEFAULT true,
    "vistoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consola_terminales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "consola_envios" (
    "id" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoEn" TIMESTAMP(3),
    CONSTRAINT "consola_envios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "consola_terminales_deviceId_pid_key" ON "consola_terminales"("deviceId", "pid");
CREATE INDEX IF NOT EXISTS "consola_terminales_deviceId_viva_idx" ON "consola_terminales"("deviceId", "viva");
CREATE INDEX IF NOT EXISTS "consola_envios_terminalId_createdAt_idx" ON "consola_envios"("terminalId", "createdAt");
CREATE INDEX IF NOT EXISTS "consola_envios_estado_createdAt_idx" ON "consola_envios"("estado", "createdAt");

DO $$ BEGIN
    ALTER TABLE "consola_terminales" ADD CONSTRAINT "consola_terminales_deviceId_fkey"
        FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "consola_envios" ADD CONSTRAINT "consola_envios_terminalId_fkey"
        FOREIGN KEY ("terminalId") REFERENCES "consola_terminales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
