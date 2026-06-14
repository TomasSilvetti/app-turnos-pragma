import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ⚠️ ENDPOINT TEMPORAL — aplicar la migración del módulo notas a la base de
// producción (Vercel no corrió `prisma migrate deploy` en el deploy).
// Todo es idempotente y aditivo (IF NOT EXISTS). Se elimina tras usarlo.
const SECRET = "6bacd58e8e611598974fa0e3f8bf1a8b4568d8053dffde4e";
const MIGRATION_NAME = "20260614144638_add_notas_module";
const MIGRATION_CHECKSUM = "d4ccfafb7eefe1d6fd9a7af9de98b739f77805a9c953184cf94a4a1440de8dcb";

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "nota_devices" (
    "id" TEXT NOT NULL,
    "recoveryPhrase" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nota_devices_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "notas" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "nota_reminders" (
    "id" TEXT NOT NULL,
    "notaId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "time" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "oneTimeDate" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFiredKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nota_reminders_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "nota_progresses" (
    "id" TEXT NOT NULL,
    "notaId" TEXT NOT NULL,
    "hasGoal" BOOLEAN NOT NULL DEFAULT false,
    "goal" INTEGER,
    "count" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT 'blue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nota_progresses_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "nota_push_subscriptions" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nota_push_subscriptions_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "nota_devices_recoveryPhrase_key" ON "nota_devices"("recoveryPhrase")`,
  `CREATE INDEX IF NOT EXISTS "notas_deviceId_idx" ON "notas"("deviceId")`,
  `CREATE INDEX IF NOT EXISTS "nota_reminders_deviceId_enabled_idx" ON "nota_reminders"("deviceId", "enabled")`,
  `CREATE INDEX IF NOT EXISTS "nota_reminders_notaId_idx" ON "nota_reminders"("notaId")`,
  `CREATE INDEX IF NOT EXISTS "nota_progresses_notaId_idx" ON "nota_progresses"("notaId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "nota_push_subscriptions_endpoint_key" ON "nota_push_subscriptions"("endpoint")`,
  `CREATE INDEX IF NOT EXISTS "nota_push_subscriptions_deviceId_idx" ON "nota_push_subscriptions"("deviceId")`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notas_deviceId_fkey') THEN
     ALTER TABLE "notas" ADD CONSTRAINT "notas_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nota_reminders_notaId_fkey') THEN
     ALTER TABLE "nota_reminders" ADD CONSTRAINT "nota_reminders_notaId_fkey" FOREIGN KEY ("notaId") REFERENCES "notas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nota_progresses_notaId_fkey') THEN
     ALTER TABLE "nota_progresses" ADD CONSTRAINT "nota_progresses_notaId_fkey" FOREIGN KEY ("notaId") REFERENCES "notas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nota_push_subscriptions_deviceId_fkey') THEN
     ALTER TABLE "nota_push_subscriptions" ADD CONSTRAINT "nota_push_subscriptions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   END IF; END $$`,
];

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultados: string[] = [];
  try {
    for (const sql of STATEMENTS) {
      await prisma.$executeRawUnsafe(sql);
      resultados.push(sql.slice(0, 60).replace(/\s+/g, " "));
    }

    // Registrar la migración para que Prisma la considere aplicada.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       SELECT $1, $2, now(), $3, NULL, NULL, now(), 1
       WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $3)`,
      randomUUID(),
      MIGRATION_CHECKSUM,
      MIGRATION_NAME
    );

    return NextResponse.json({ ok: true, aplicadas: resultados.length });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), aplicadasAntesDelError: resultados },
      { status: 500 }
    );
  }
}
