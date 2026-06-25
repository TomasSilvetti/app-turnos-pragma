-- Precios de servicios (procesos) y monto por item de OT.
ALTER TABLE "lav_procesos" ADD COLUMN IF NOT EXISTS "precio" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "lav_procesos" ADD COLUMN IF NOT EXISTS "esExtra" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "lav_ot_items" ADD COLUMN IF NOT EXISTS "monto" INTEGER NOT NULL DEFAULT 0;
