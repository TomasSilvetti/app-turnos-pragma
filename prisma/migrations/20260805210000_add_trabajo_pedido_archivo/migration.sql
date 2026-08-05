-- Itemizar un archivo de la notebook: el pedido guarda la ruta, nunca el contenido.
CREATE TABLE IF NOT EXISTS "trabajo_pedidos_archivo" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT '',
    "alcance" TEXT NOT NULL DEFAULT '',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "error" TEXT,
    "itemsCreados" INTEGER NOT NULL DEFAULT 0,
    "pedidoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trabajo_pedidos_archivo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "trabajo_pedidos_archivo_deviceId_estado_idx" ON "trabajo_pedidos_archivo"("deviceId", "estado");

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_pedidos_archivo_deviceId_fkey') THEN
  ALTER TABLE "trabajo_pedidos_archivo" ADD CONSTRAINT "trabajo_pedidos_archivo_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- De donde salio el item, cuando salio de un informe.
ALTER TABLE "trabajo_items" ADD COLUMN IF NOT EXISTS "fuenteArchivo" TEXT;
ALTER TABLE "trabajo_items" ADD COLUMN IF NOT EXISTS "fuenteAncla" TEXT;
ALTER TABLE "trabajo_items" ADD COLUMN IF NOT EXISTS "pedidoArchivoId" TEXT;

CREATE INDEX IF NOT EXISTS "trabajo_items_pedidoArchivoId_idx" ON "trabajo_items"("pedidoArchivoId");

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_items_pedidoArchivoId_fkey') THEN
  ALTER TABLE "trabajo_items" ADD CONSTRAINT "trabajo_items_pedidoArchivoId_fkey" FOREIGN KEY ("pedidoArchivoId") REFERENCES "trabajo_pedidos_archivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END IF; END $$;
