-- Recuperación por contraseña elegida por el usuario (reemplaza la frase autogenerada).
-- DropIndex
DROP INDEX IF EXISTS "nota_devices_recoveryPhrase_key";

-- AlterTable
ALTER TABLE "nota_devices" DROP COLUMN IF EXISTS "recoveryPhrase";
ALTER TABLE "nota_devices" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "nota_devices_passwordHash_key" ON "nota_devices"("passwordHash");
