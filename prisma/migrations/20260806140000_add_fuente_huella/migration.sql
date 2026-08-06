-- La huella de la fuente: detectar que el informe cambió después de itemizar.
ALTER TABLE "trabajo_items" ADD COLUMN IF NOT EXISTS "fuenteHuella" TEXT;
ALTER TABLE "trabajo_items" ADD COLUMN IF NOT EXISTS "fuenteCambiada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "trabajo_items" ADD COLUMN IF NOT EXISTS "fuenteRevisadaEn" TIMESTAMP(3);
