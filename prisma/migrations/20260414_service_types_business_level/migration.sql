-- Migración: mover service_types de serviceProviderId a businessProfileId
-- Para cada service_type existente, asigna el businessProfileId del dueño de la empresa

-- 1. Agregar columna nueva como nullable
ALTER TABLE "service_types" ADD COLUMN "businessProfileId" TEXT;

-- 2. Asignar businessProfileId usando el serviceProviderId existente
--    Primero intentar mapear directamente (si es el dueño)
UPDATE "service_types" st
SET "businessProfileId" = bp.id
FROM "business_profiles" bp
WHERE bp."serviceProviderId" = st."serviceProviderId";

-- 3. Para empleados que no son dueños, buscar via empleado_empresas
UPDATE "service_types" st
SET "businessProfileId" = ee."businessProfileId"
FROM "empleado_empresas" ee
WHERE ee."serviceProviderId" = st."serviceProviderId"
  AND st."businessProfileId" IS NULL;

-- 4. Eliminar filas huérfanas (sin empresa asociada, caso borde)
DELETE FROM "service_types" WHERE "businessProfileId" IS NULL;

-- 5. Hacer columna obligatoria y agregar FK
ALTER TABLE "service_types" ALTER COLUMN "businessProfileId" SET NOT NULL;
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_businessProfileId_fkey"
  FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Eliminar FK y columna vieja
ALTER TABLE "service_types" DROP CONSTRAINT IF EXISTS "service_types_serviceProviderId_fkey";
ALTER TABLE "service_types" DROP COLUMN "serviceProviderId";
