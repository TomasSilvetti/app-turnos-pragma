-- Bandeja de trabajo en crudo y sus sugerencias de ítem.

CREATE TABLE IF NOT EXISTS "trabajo_bandejas" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "contenido" JSONB NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'vacia',
    "error" TEXT,
    "pedidoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trabajo_bandejas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "trabajo_sugerencias" (
    "id" TEXT NOT NULL,
    "bandejaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT '',
    "proyecto" TEXT NOT NULL DEFAULT '',
    "desdeBid" TEXT NOT NULL,
    "hastaBid" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trabajo_sugerencias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "trabajo_bandejas_deviceId_key" ON "trabajo_bandejas"("deviceId");
CREATE INDEX IF NOT EXISTS "trabajo_sugerencias_bandejaId_orden_idx" ON "trabajo_sugerencias"("bandejaId", "orden");

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_bandejas_deviceId_fkey') THEN
  ALTER TABLE "trabajo_bandejas" ADD CONSTRAINT "trabajo_bandejas_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_sugerencias_bandejaId_fkey') THEN
  ALTER TABLE "trabajo_sugerencias" ADD CONSTRAINT "trabajo_sugerencias_bandejaId_fkey" FOREIGN KEY ("bandejaId") REFERENCES "trabajo_bandejas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- Una imagen pegada en el crudo todavía no pertenece a ningún ítem.
ALTER TABLE "trabajo_imagenes" ALTER COLUMN "itemId" DROP NOT NULL;
ALTER TABLE "trabajo_imagenes" ADD COLUMN IF NOT EXISTS "bandejaId" TEXT;

CREATE INDEX IF NOT EXISTS "trabajo_imagenes_bandejaId_idx" ON "trabajo_imagenes"("bandejaId");
-- El borrado de blobs consulta por pathname para no borrar uno todavía en uso.
CREATE INDEX IF NOT EXISTS "trabajo_imagenes_pathname_idx" ON "trabajo_imagenes"("pathname");

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_imagenes_bandejaId_fkey') THEN
  ALTER TABLE "trabajo_imagenes" ADD CONSTRAINT "trabajo_imagenes_bandejaId_fkey" FOREIGN KEY ("bandejaId") REFERENCES "trabajo_bandejas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;
