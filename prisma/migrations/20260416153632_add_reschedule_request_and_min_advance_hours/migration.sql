-- CreateEnum
CREATE TYPE "RescheduleRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "schedule_configs" ADD COLUMN     "minAdvanceHours" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "reschedule_requests" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "requestedDate" TEXT NOT NULL,
    "requestedTime" TEXT NOT NULL,
    "status" "RescheduleRequestStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reschedule_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
