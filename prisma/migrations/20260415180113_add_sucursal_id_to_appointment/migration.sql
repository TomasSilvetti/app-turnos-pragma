-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "sucursalId" TEXT;

-- CreateTable
CREATE TABLE "disabled_slots" (
    "id" TEXT NOT NULL,
    "scheduleConfigId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disabled_slots_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "disabled_slots" ADD CONSTRAINT "disabled_slots_scheduleConfigId_fkey" FOREIGN KEY ("scheduleConfigId") REFERENCES "schedule_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
