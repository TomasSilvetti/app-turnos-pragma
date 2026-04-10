-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'requires_reschedule';

-- AlterTable
ALTER TABLE "schedule_configs" ADD COLUMN     "daysOfWeek" INTEGER[];

-- CreateTable
CREATE TABLE "_ScheduleConfigToServiceType" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ScheduleConfigToServiceType_AB_unique" ON "_ScheduleConfigToServiceType"("A", "B");

-- CreateIndex
CREATE INDEX "_ScheduleConfigToServiceType_B_index" ON "_ScheduleConfigToServiceType"("B");

-- AddForeignKey
ALTER TABLE "_ScheduleConfigToServiceType" ADD CONSTRAINT "_ScheduleConfigToServiceType_A_fkey" FOREIGN KEY ("A") REFERENCES "schedule_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScheduleConfigToServiceType" ADD CONSTRAINT "_ScheduleConfigToServiceType_B_fkey" FOREIGN KEY ("B") REFERENCES "service_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
