-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "brandColor" TEXT NOT NULL DEFAULT '#1e3a5f',
ADD COLUMN     "brandColorDark" TEXT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'light';
