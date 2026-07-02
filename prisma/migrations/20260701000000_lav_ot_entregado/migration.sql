-- Marca de entrega al cliente de una OT terminada (modulo "terminados").
ALTER TABLE "lav_ots" ADD COLUMN IF NOT EXISTS "entregadoEn" TIMESTAMP(3);
