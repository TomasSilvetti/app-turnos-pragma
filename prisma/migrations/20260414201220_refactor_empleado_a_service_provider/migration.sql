/*
  Warnings:

  - You are about to drop the column `empleadoId` on the `empleado_empresas` table. All the data in the column will be lost.
  - You are about to drop the column `rol` on the `empleado_empresas` table. All the data in the column will be lost.
  - You are about to drop the column `empleadoId` on the `empleado_sucursales` table. All the data in the column will be lost.
  - You are about to drop the `empleados` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `serviceProviderId` to the `empleado_empresas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceProviderId` to the `empleado_sucursales` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ServiceProviderRol" AS ENUM ('propietario', 'administrador', 'empleado');

-- DropForeignKey
ALTER TABLE "empleado_empresas" DROP CONSTRAINT "empleado_empresas_empleadoId_fkey";

-- DropForeignKey
ALTER TABLE "empleado_sucursales" DROP CONSTRAINT "empleado_sucursales_empleadoId_fkey";

-- Limpiar datos de prueba para poder agregar columnas NOT NULL
DELETE FROM "empleado_sucursales";
DELETE FROM "empleado_empresas";

-- AlterTable
ALTER TABLE "empleado_empresas" DROP COLUMN "empleadoId",
DROP COLUMN "rol",
ADD COLUMN     "serviceProviderId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "empleado_sucursales" DROP COLUMN "empleadoId",
ADD COLUMN     "serviceProviderId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "service_providers" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rol" "ServiceProviderRol" NOT NULL DEFAULT 'propietario';

-- DropTable
DROP TABLE "empleados";

-- DropEnum
DROP TYPE "EmpleadoRol";

-- AddForeignKey
ALTER TABLE "empleado_empresas" ADD CONSTRAINT "empleado_empresas_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleado_sucursales" ADD CONSTRAINT "empleado_sucursales_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
