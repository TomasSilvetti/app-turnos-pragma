/*
  Warnings:

  - Added the required column `name` to the `schedule_configs` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "schedule_configs_businessProfileId_key";

-- AlterTable
ALTER TABLE "schedule_configs" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT NOT NULL;
