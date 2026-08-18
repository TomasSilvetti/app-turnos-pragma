-- Precios del ticket: importe por renglón, total impreso y forma de pago.
-- Son transcripciones de la comanda, no valores calculados: NULL = no se leyó.
ALTER TABLE "lav_ot_items" ADD COLUMN IF NOT EXISTS "precioUnit" DECIMAL(12,2);
ALTER TABLE "lav_ot_items" ADD COLUMN IF NOT EXISTS "precioTotal" DECIMAL(12,2);

ALTER TABLE "lav_ots" ADD COLUMN IF NOT EXISTS "totalTicket" DECIMAL(12,2);
ALTER TABLE "lav_ots" ADD COLUMN IF NOT EXISTS "formaPago" TEXT;

ALTER TABLE "lav_ot_historico" ADD COLUMN IF NOT EXISTS "totalTicket" DECIMAL(12,2);
ALTER TABLE "lav_ot_historico" ADD COLUMN IF NOT EXISTS "sumaItems" DECIMAL(12,2);
ALTER TABLE "lav_ot_historico" ADD COLUMN IF NOT EXISTS "formaPago" TEXT;
