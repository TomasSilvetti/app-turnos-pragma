-- Auto-division de OTs grandes: las sub-OTs comparten grupoId y numero, y llevan
-- su indice de parte (parteIndice/parteTotal). null en una OT no dividida.
ALTER TABLE "lav_ots" ADD COLUMN IF NOT EXISTS "grupoId" TEXT;
ALTER TABLE "lav_ots" ADD COLUMN IF NOT EXISTS "parteIndice" INTEGER;
ALTER TABLE "lav_ots" ADD COLUMN IF NOT EXISTS "parteTotal" INTEGER;

CREATE INDEX IF NOT EXISTS "lav_ots_grupoId_idx" ON "lav_ots"("grupoId");
