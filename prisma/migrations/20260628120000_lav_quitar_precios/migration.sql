-- Quita todo lo de precios de la lavandería: la matriz de precios prenda x
-- servicio, el monto por línea de OT y el total del ticket.
DROP TABLE IF EXISTS "lav_precios";

ALTER TABLE "lav_ot_items" DROP COLUMN IF EXISTS "monto";

ALTER TABLE "lav_ots" DROP COLUMN IF EXISTS "total";
