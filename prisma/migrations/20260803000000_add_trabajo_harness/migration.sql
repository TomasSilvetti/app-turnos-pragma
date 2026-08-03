-- Sección Trabajo: cola del harness de cuentas dentro de la app de notas.

CREATE TABLE IF NOT EXISTS "trabajo_items" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT '',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "proyecto" TEXT NOT NULL DEFAULT '',
    "pasoActual" INTEGER NOT NULL DEFAULT 0,
    "pasosTotales" INTEGER NOT NULL DEFAULT 0,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "sesionInicio" TIMESTAMP(3),
    "cuenta" TEXT,
    "motivoBloqueo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadoEn" TIMESTAMP(3),
    CONSTRAINT "trabajo_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "trabajo_prompts" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'inicial',
    "contenido" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trabajo_prompts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "trabajo_log_entries" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'hito',
    "texto" TEXT NOT NULL DEFAULT '',
    "paso" INTEGER,
    "cuenta" TEXT,
    "requiereIntervencion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trabajo_log_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "trabajo_imagenes" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "logEntryId" TEXT,
    "promptId" TEXT,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "ancho" INTEGER NOT NULL DEFAULT 0,
    "alto" INTEGER NOT NULL DEFAULT 0,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trabajo_imagenes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "harness_cuentas" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "tokensVentana" INTEGER NOT NULL DEFAULT 0,
    "techoObservado" INTEGER,
    "resetAt" TIMESTAMP(3),
    "ventanaInicio" TIMESTAMP(3),
    "ultimaSesionAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "harness_cuentas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "harness_estado" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'detenido',
    "itemEnCursoId" TEXT,
    "sesionInicio" TIMESTAMP(3),
    "cuentaActual" TEXT,
    "limiteSesionMin" INTEGER NOT NULL DEFAULT 90,
    "actualizadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "harness_estado_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "trabajo_items_deviceId_estado_orden_idx" ON "trabajo_items"("deviceId", "estado", "orden");
CREATE INDEX IF NOT EXISTS "trabajo_prompts_itemId_idx" ON "trabajo_prompts"("itemId");
CREATE INDEX IF NOT EXISTS "trabajo_log_entries_itemId_createdAt_idx" ON "trabajo_log_entries"("itemId", "createdAt");
CREATE INDEX IF NOT EXISTS "trabajo_imagenes_itemId_idx" ON "trabajo_imagenes"("itemId");
CREATE INDEX IF NOT EXISTS "trabajo_imagenes_logEntryId_idx" ON "trabajo_imagenes"("logEntryId");
CREATE INDEX IF NOT EXISTS "trabajo_imagenes_promptId_idx" ON "trabajo_imagenes"("promptId");
CREATE UNIQUE INDEX IF NOT EXISTS "harness_cuentas_deviceId_nombre_key" ON "harness_cuentas"("deviceId", "nombre");
CREATE UNIQUE INDEX IF NOT EXISTS "harness_estado_deviceId_key" ON "harness_estado"("deviceId");

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_items_deviceId_fkey') THEN
  ALTER TABLE "trabajo_items" ADD CONSTRAINT "trabajo_items_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_prompts_itemId_fkey') THEN
  ALTER TABLE "trabajo_prompts" ADD CONSTRAINT "trabajo_prompts_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "trabajo_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_log_entries_itemId_fkey') THEN
  ALTER TABLE "trabajo_log_entries" ADD CONSTRAINT "trabajo_log_entries_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "trabajo_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_imagenes_itemId_fkey') THEN
  ALTER TABLE "trabajo_imagenes" ADD CONSTRAINT "trabajo_imagenes_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "trabajo_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_imagenes_logEntryId_fkey') THEN
  ALTER TABLE "trabajo_imagenes" ADD CONSTRAINT "trabajo_imagenes_logEntryId_fkey" FOREIGN KEY ("logEntryId") REFERENCES "trabajo_log_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_imagenes_promptId_fkey') THEN
  ALTER TABLE "trabajo_imagenes" ADD CONSTRAINT "trabajo_imagenes_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "trabajo_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'harness_cuentas_deviceId_fkey') THEN
  ALTER TABLE "harness_cuentas" ADD CONSTRAINT "harness_cuentas_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'harness_estado_deviceId_fkey') THEN
  ALTER TABLE "harness_estado" ADD CONSTRAINT "harness_estado_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'harness_estado_itemEnCursoId_fkey') THEN
  ALTER TABLE "harness_estado" ADD CONSTRAINT "harness_estado_itemEnCursoId_fkey" FOREIGN KEY ("itemEnCursoId") REFERENCES "trabajo_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END IF; END $$;
