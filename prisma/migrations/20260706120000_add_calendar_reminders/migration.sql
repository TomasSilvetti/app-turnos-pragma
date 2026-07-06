ALTER TABLE "nota_calendar_events" ADD COLUMN IF NOT EXISTS "reminderOffsets" INTEGER[] NOT NULL DEFAULT '{}';
ALTER TABLE "nota_calendar_events" ADD COLUMN IF NOT EXISTS "firedKeys" TEXT[] NOT NULL DEFAULT '{}';
