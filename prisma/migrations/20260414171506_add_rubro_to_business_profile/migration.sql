/*
  Warnings:

  - Added the required column `rubro` to the `business_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "rubro" TEXT NOT NULL DEFAULT '';
