/*
  Warnings:

  - A unique constraint covering the columns `[notificacionToken]` on the table `lista_espera` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "lista_espera" ADD COLUMN     "notificacionToken" TEXT,
ADD COLUMN     "notificacionTokenExp" TIMESTAMP(3),
ADD COLUMN     "vacanteTurnoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "lista_espera_notificacionToken_key" ON "lista_espera"("notificacionToken");
