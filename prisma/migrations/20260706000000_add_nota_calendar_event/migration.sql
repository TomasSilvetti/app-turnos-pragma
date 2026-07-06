CREATE TABLE IF NOT EXISTS "nota_calendar_events" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT 'blue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nota_calendar_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "nota_calendar_events_deviceId_date_idx" ON "nota_calendar_events"("deviceId", "date");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nota_calendar_events_deviceId_fkey') THEN
  ALTER TABLE "nota_calendar_events" ADD CONSTRAINT "nota_calendar_events_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;
