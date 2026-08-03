-- Log del harness visible desde la app, sobre todo para saber si un apagado funcionó.

CREATE TABLE IF NOT EXISTS "harness_eventos" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "carril" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'info',
    "texto" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "harness_eventos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "harness_eventos_deviceId_createdAt_idx" ON "harness_eventos"("deviceId", "createdAt");

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'harness_eventos_deviceId_fkey') THEN
  ALTER TABLE "harness_eventos" ADD CONSTRAINT "harness_eventos_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;
