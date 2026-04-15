-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "paymentMethod" TEXT;

-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "cashEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "transferEnabled" BOOLEAN NOT NULL DEFAULT true;
