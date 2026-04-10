/*
  Warnings:

  - Added the required column `date` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceProviderId` to the `appointments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'cancelled');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "date" TEXT NOT NULL,
ADD COLUMN     "serviceProviderId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_appointmentId_key" ON "bookings"("appointmentId");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "service_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
