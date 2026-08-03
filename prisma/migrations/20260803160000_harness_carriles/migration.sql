-- Dos carriles (trabajo e itemización) y control de cuentas.

ALTER TABLE "harness_cuentas" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "harness_cuentas" ADD COLUMN IF NOT EXISTS "habilitada" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "harness_cuentas" ADD COLUMN IF NOT EXISTS "carril" TEXT;

-- El latido pasa a ser uno por carril. Lo que había era del carril de trabajo.
ALTER TABLE "harness_estado" ADD COLUMN IF NOT EXISTS "carril" TEXT NOT NULL DEFAULT 'trabajo';
DROP INDEX IF EXISTS "harness_estado_deviceId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "harness_estado_deviceId_carril_key" ON "harness_estado"("deviceId", "carril");
