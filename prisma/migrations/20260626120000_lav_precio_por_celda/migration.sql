-- Precio por celda (prenda x proceso) en lugar de precio por proceso.
ALTER TABLE "lav_duraciones" ADD COLUMN IF NOT EXISTS "precio" INTEGER NOT NULL DEFAULT 0;

-- Preservar precios actuales: copiar el precio del proceso a cada celda existente
-- (solo donde la celda todavia no tiene precio propio).
UPDATE "lav_duraciones" d
SET "precio" = p."precio"
FROM "lav_procesos" p
WHERE d."procesoId" = p."id" AND d."precio" = 0;
