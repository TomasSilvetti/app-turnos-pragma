-- Consola: sesiones de Claude Code manejadas desde el celular.

CREATE TABLE IF NOT EXISTS "consola_sesiones" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT '',
    "cuenta" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'idle',
    "error" TEXT,
    "directorio" TEXT NOT NULL DEFAULT '',
    "archivada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consola_sesiones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "consola_mensajes" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'usuario',
    "texto" TEXT NOT NULL DEFAULT '',
    "parcial" BOOLEAN NOT NULL DEFAULT false,
    "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consola_mensajes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "consola_capturas" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "ancho" INTEGER NOT NULL DEFAULT 0,
    "alto" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'lista',
    "pedidaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consola_capturas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "consola_sesiones_sessionId_key" ON "consola_sesiones"("sessionId");
CREATE INDEX IF NOT EXISTS "consola_sesiones_deviceId_archivada_updatedAt_idx" ON "consola_sesiones"("deviceId", "archivada", "updatedAt");
CREATE INDEX IF NOT EXISTS "consola_mensajes_sesionId_createdAt_idx" ON "consola_mensajes"("sesionId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "consola_capturas_deviceId_key" ON "consola_capturas"("deviceId");

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consola_sesiones_deviceId_fkey') THEN
  ALTER TABLE "consola_sesiones" ADD CONSTRAINT "consola_sesiones_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consola_mensajes_sesionId_fkey') THEN
  ALTER TABLE "consola_mensajes" ADD CONSTRAINT "consola_mensajes_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "consola_sesiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consola_capturas_deviceId_fkey') THEN
  ALTER TABLE "consola_capturas" ADD CONSTRAINT "consola_capturas_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;
