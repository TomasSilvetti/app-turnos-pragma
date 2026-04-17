-- CreateEnum
CREATE TYPE "ModoTurno" AS ENUM ('FIJO', 'POR_TIPO');

-- AlterTable
ALTER TABLE "service_providers" ADD COLUMN     "modoTurno" "ModoTurno" NOT NULL DEFAULT 'FIJO';

-- AlterTable
ALTER TABLE "service_types" ADD COLUMN     "duracion" INTEGER;
