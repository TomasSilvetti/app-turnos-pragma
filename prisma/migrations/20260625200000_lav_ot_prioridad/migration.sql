-- Prioridad de OTs: URGENTE y "PARA <fecha>"
ALTER TABLE "lav_ots" ADD COLUMN "urgente" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "lav_ots" ADD COLUMN "fechaNecesaria" TEXT;
