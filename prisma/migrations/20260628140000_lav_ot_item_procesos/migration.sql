-- Los ítems de OT ahora llevan los PROCESOS aplicados a la prenda (columnas de la
-- matriz), no servicios. La duración se calcula sumando minutos[prenda][proceso].
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lav_ot_items' AND column_name = 'servicioIds')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lav_ot_items' AND column_name = 'procesoIds') THEN
    ALTER TABLE "lav_ot_items" RENAME COLUMN "servicioIds" TO "procesoIds";
  END IF;
END $$;
ALTER TABLE "lav_ot_items" ADD COLUMN IF NOT EXISTS "procesoIds" TEXT[] NOT NULL DEFAULT '{}';
