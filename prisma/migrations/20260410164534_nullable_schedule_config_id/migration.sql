-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_scheduleConfigId_fkey";

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "scheduleConfigId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_scheduleConfigId_fkey" FOREIGN KEY ("scheduleConfigId") REFERENCES "schedule_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
