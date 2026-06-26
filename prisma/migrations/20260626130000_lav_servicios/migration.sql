-- Reestructura: prendas, procesos (granular) y servicios.
-- Empezar de cero con la config (procesos/tiempos/precios se recargan a mano).

CREATE TABLE IF NOT EXISTS "lav_servicios" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lav_servicios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lav_servicio_procesos" (
  "id" TEXT NOT NULL,
  "servicioId" TEXT NOT NULL,
  "procesoId" TEXT NOT NULL,
  CONSTRAINT "lav_servicio_procesos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "lav_servicio_procesos_servicioId_procesoId_key" ON "lav_servicio_procesos"("servicioId", "procesoId");
CREATE INDEX IF NOT EXISTS "lav_servicio_procesos_servicioId_idx" ON "lav_servicio_procesos"("servicioId");
CREATE INDEX IF NOT EXISTS "lav_servicio_procesos_procesoId_idx" ON "lav_servicio_procesos"("procesoId");

CREATE TABLE IF NOT EXISTS "lav_precios" (
  "id" TEXT NOT NULL,
  "prendaId" TEXT NOT NULL,
  "servicioId" TEXT NOT NULL,
  "precio" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "lav_precios_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "lav_precios_prendaId_servicioId_key" ON "lav_precios"("prendaId", "servicioId");
CREATE INDEX IF NOT EXISTS "lav_precios_prendaId_idx" ON "lav_precios"("prendaId");
CREATE INDEX IF NOT EXISTS "lav_precios_servicioId_idx" ON "lav_precios"("servicioId");

-- FKs (idempotentes)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lav_servicio_procesos_servicioId_fkey') THEN
  ALTER TABLE "lav_servicio_procesos" ADD CONSTRAINT "lav_servicio_procesos_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "lav_servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lav_servicio_procesos_procesoId_fkey') THEN
  ALTER TABLE "lav_servicio_procesos" ADD CONSTRAINT "lav_servicio_procesos_procesoId_fkey" FOREIGN KEY ("procesoId") REFERENCES "lav_procesos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lav_precios_prendaId_fkey') THEN
  ALTER TABLE "lav_precios" ADD CONSTRAINT "lav_precios_prendaId_fkey" FOREIGN KEY ("prendaId") REFERENCES "lav_prendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lav_precios_servicioId_fkey') THEN
  ALTER TABLE "lav_precios" ADD CONSTRAINT "lav_precios_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "lav_servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- OT items: pasar de procesos[] (nombres) a servicioIds[] (ids).
ALTER TABLE "lav_ot_items" ADD COLUMN IF NOT EXISTS "servicioIds" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "lav_ot_items" DROP COLUMN IF EXISTS "procesos";

-- Procesos pasan a ser granulares: se quita precio/esExtra.
ALTER TABLE "lav_procesos" DROP COLUMN IF EXISTS "precio";
ALTER TABLE "lav_procesos" DROP COLUMN IF EXISTS "esExtra";

-- Tiempos solo minutos.
ALTER TABLE "lav_duraciones" DROP COLUMN IF EXISTS "precio";

-- Empezar de cero con la config de procesos/tiempos.
TRUNCATE TABLE "lav_duraciones", "lav_procesos" CASCADE;
