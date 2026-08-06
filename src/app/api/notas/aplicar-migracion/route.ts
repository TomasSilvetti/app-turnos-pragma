import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ⚠️ ENDPOINT DE MIGRACIÓN — aplica todas las migraciones del módulo notas
// en la base de producción (Vercel no corre `prisma migrate deploy`).
// Todos los statements son idempotentes (IF NOT EXISTS / DROP IF EXISTS).
const SECRET = "6bacd58e8e611598974fa0e3f8bf1a8b4568d8053dffde4e";

type Migration = { name: string; checksum: string; statements: string[] };

const MIGRATIONS: Migration[] = [
  {
    name: "20260614144638_add_notas_module",
    checksum: "d4ccfafb7eefe1d6fd9a7af9de98b739f77805a9c953184cf94a4a1440de8dcb",
    statements: [
      `CREATE TABLE IF NOT EXISTS "nota_devices" (
        "id" TEXT NOT NULL,
        "recoveryPhrase" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "nota_devices_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "notas" (
        "id" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "title" TEXT NOT NULL DEFAULT '',
        "content" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
      `CREATE UNIQUE INDEX IF NOT EXISTS "nota_devices_recoveryPhrase_key" ON "nota_devices"("recoveryPhrase") WHERE "recoveryPhrase" IS NOT NULL`,
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
    ],
  },
  {
    name: "20260614191500_notas_password_recovery",
    checksum: "6fd7d1fb16408fdcf7a12a22c1e010843028c45d6e8e368d9608371a584aee68",
    statements: [
      // Hacer la columna recoveryPhrase nullable antes de eliminarla (por si hay NOT NULL constraint).
      `DO $$ BEGIN
         IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nota_devices' AND column_name='recoveryPhrase') THEN
           ALTER TABLE "nota_devices" ALTER COLUMN "recoveryPhrase" DROP NOT NULL;
         END IF;
       END $$`,
      `DROP INDEX IF EXISTS "nota_devices_recoveryPhrase_key"`,
      `DO $$ BEGIN
         IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nota_devices' AND column_name='recoveryPhrase') THEN
           ALTER TABLE "nota_devices" DROP COLUMN "recoveryPhrase";
         END IF;
       END $$`,
      `ALTER TABLE "nota_devices" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "nota_devices_passwordHash_key" ON "nota_devices"("passwordHash") WHERE "passwordHash" IS NOT NULL`,
    ],
  },
  {
    name: "20260614200000_add_nota_progress_note",
    checksum: "3fafc36f9574fe014118f26a34e6fffc75077c8e15814dbe10172b3ed2890a16",
    statements: [
      `CREATE TABLE IF NOT EXISTS "nota_progress_notes" (
        "id" TEXT NOT NULL,
        "progressId" TEXT NOT NULL,
        "text" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "nota_progress_notes_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE INDEX IF NOT EXISTS "nota_progress_notes_progressId_idx" ON "nota_progress_notes"("progressId")`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nota_progress_notes_progressId_fkey') THEN
         ALTER TABLE "nota_progress_notes" ADD CONSTRAINT "nota_progress_notes_progressId_fkey"
         FOREIGN KEY ("progressId") REFERENCES "nota_progresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
    ],
  },
  {
    name: "20260615020000_add_reminder_interval",
    checksum: "0d37de74ac73aa479a3c29d362bdb06a368f0def05d858e65b55f09687a52add",
    statements: [
      `ALTER TABLE "nota_reminders" ADD COLUMN IF NOT EXISTS "intervalMinutes" INTEGER`,
      `ALTER TABLE "nota_reminders" ADD COLUMN IF NOT EXISTS "endTime" TEXT`,
    ],
  },
  {
    name: "20260616000000_add_progress_note_dotcolor",
    checksum: "67708f00eaf9513c6c0a37509e54d6f1ae246be03351e8e96420ace7c904254f",
    statements: [
      `ALTER TABLE "nota_progress_notes" ADD COLUMN IF NOT EXISTS "dotColor" TEXT NOT NULL DEFAULT 'green'`,
    ],
  },
  {
    name: "20260625000000_lav_admin_auth",
    checksum: "fd6722c4ada0f58e4a2d45daa1faf9760ff236a02e9b9d2ffd39cf54bd8419ac",
    statements: [
      `ALTER TABLE "lav_empleados" ADD COLUMN IF NOT EXISTS "email" TEXT`,
      `ALTER TABLE "lav_empleados" ADD COLUMN IF NOT EXISTS "hashedPassword" TEXT`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "lav_empleados_email_key" ON "lav_empleados"("email")`,
      `CREATE TABLE IF NOT EXISTS "lav_password_reset_tokens" (
        "id" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "empleadoId" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "usedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "lav_password_reset_tokens_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "lav_password_reset_tokens_token_key" ON "lav_password_reset_tokens"("token")`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lav_password_reset_tokens_empleadoId_fkey') THEN
         ALTER TABLE "lav_password_reset_tokens" ADD CONSTRAINT "lav_password_reset_tokens_empleadoId_fkey"
         FOREIGN KEY ("empleadoId") REFERENCES "lav_empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
    ],
  },
  {
    name: "20260625120000_lav_precios",
    checksum: "4a7154d58fd5efa28a1d8d7e4dbabdcfd22673f284294982e5c45f8b9746facd",
    statements: [
      `ALTER TABLE "lav_procesos" ADD COLUMN IF NOT EXISTS "precio" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "lav_procesos" ADD COLUMN IF NOT EXISTS "esExtra" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "lav_ot_items" ADD COLUMN IF NOT EXISTS "monto" INTEGER NOT NULL DEFAULT 0`,
    ],
  },
  {
    name: "20260626120000_lav_precio_por_celda",
    checksum: "45697c3bc76d2cb3debac1bdae843ac5985ed338bde71b7146af2e2c08a029ba",
    statements: [
      `ALTER TABLE "lav_duraciones" ADD COLUMN IF NOT EXISTS "precio" INTEGER NOT NULL DEFAULT 0`,
      // Preserva los precios actuales: copia el precio del proceso a cada celda existente.
      `UPDATE "lav_duraciones" d SET "precio" = p."precio" FROM "lav_procesos" p WHERE d."procesoId" = p."id" AND d."precio" = 0`,
    ],
  },
  {
    name: "20260626130000_lav_servicios",
    checksum: "c01c26db15171cf61763d66b825b9e3f2ca0c14a8e09c70000ec2cd8168bdf37",
    statements: [
      `CREATE TABLE IF NOT EXISTS "lav_servicios" (
        "id" TEXT NOT NULL,
        "nombre" TEXT NOT NULL,
        "orden" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "lav_servicios_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "lav_servicio_procesos" (
        "id" TEXT NOT NULL,
        "servicioId" TEXT NOT NULL,
        "procesoId" TEXT NOT NULL,
        CONSTRAINT "lav_servicio_procesos_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "lav_servicio_procesos_servicioId_procesoId_key" ON "lav_servicio_procesos"("servicioId", "procesoId")`,
      `CREATE INDEX IF NOT EXISTS "lav_servicio_procesos_servicioId_idx" ON "lav_servicio_procesos"("servicioId")`,
      `CREATE INDEX IF NOT EXISTS "lav_servicio_procesos_procesoId_idx" ON "lav_servicio_procesos"("procesoId")`,
      `CREATE TABLE IF NOT EXISTS "lav_precios" (
        "id" TEXT NOT NULL,
        "prendaId" TEXT NOT NULL,
        "servicioId" TEXT NOT NULL,
        "precio" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "lav_precios_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "lav_precios_prendaId_servicioId_key" ON "lav_precios"("prendaId", "servicioId")`,
      `CREATE INDEX IF NOT EXISTS "lav_precios_prendaId_idx" ON "lav_precios"("prendaId")`,
      `CREATE INDEX IF NOT EXISTS "lav_precios_servicioId_idx" ON "lav_precios"("servicioId")`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lav_servicio_procesos_servicioId_fkey') THEN
         ALTER TABLE "lav_servicio_procesos" ADD CONSTRAINT "lav_servicio_procesos_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "lav_servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lav_servicio_procesos_procesoId_fkey') THEN
         ALTER TABLE "lav_servicio_procesos" ADD CONSTRAINT "lav_servicio_procesos_procesoId_fkey" FOREIGN KEY ("procesoId") REFERENCES "lav_procesos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lav_precios_prendaId_fkey') THEN
         ALTER TABLE "lav_precios" ADD CONSTRAINT "lav_precios_prendaId_fkey" FOREIGN KEY ("prendaId") REFERENCES "lav_prendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lav_precios_servicioId_fkey') THEN
         ALTER TABLE "lav_precios" ADD CONSTRAINT "lav_precios_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "lav_servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `ALTER TABLE "lav_ot_items" ADD COLUMN IF NOT EXISTS "servicioIds" TEXT[] NOT NULL DEFAULT '{}'`,
      `ALTER TABLE "lav_ot_items" DROP COLUMN IF EXISTS "procesos"`,
      `ALTER TABLE "lav_procesos" DROP COLUMN IF EXISTS "precio"`,
      `ALTER TABLE "lav_procesos" DROP COLUMN IF EXISTS "esExtra"`,
      `ALTER TABLE "lav_duraciones" DROP COLUMN IF EXISTS "precio"`,
      `TRUNCATE TABLE "lav_duraciones", "lav_procesos" CASCADE`,
    ],
  },
  {
    name: "20260628000000_lav_prenda_incompleta",
    checksum: "10e86c22c833985bf7f9a7e9685f26c0063a9a5ddd77959f4dfc419baf02000f",
    statements: [
      `ALTER TABLE "lav_prendas" ADD COLUMN IF NOT EXISTS "incompleta" BOOLEAN NOT NULL DEFAULT false`,
    ],
  },
  {
    name: "20260628120000_lav_quitar_precios",
    checksum: "fc2f7eee67b777d37c5d2cef3865cc2cc47245526881e90af399dae10c5a48de",
    statements: [
      `DROP TABLE IF EXISTS "lav_precios"`,
      `ALTER TABLE "lav_ot_items" DROP COLUMN IF EXISTS "monto"`,
      `ALTER TABLE "lav_ots" DROP COLUMN IF EXISTS "total"`,
    ],
  },
  {
    name: "20260628140000_lav_ot_item_procesos",
    checksum: "fe6d71d4256c8ac60cbf54d25cf9096cfe9936d2f215ba72e50142f9255cc675",
    statements: [
      `DO $$ BEGIN
         IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lav_ot_items' AND column_name = 'servicioIds')
            AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lav_ot_items' AND column_name = 'procesoIds') THEN
           ALTER TABLE "lav_ot_items" RENAME COLUMN "servicioIds" TO "procesoIds";
         END IF;
       END $$`,
      `ALTER TABLE "lav_ot_items" ADD COLUMN IF NOT EXISTS "procesoIds" TEXT[] NOT NULL DEFAULT '{}'`,
    ],
  },
  {
    name: "20260702000000_lav_ot_historico",
    checksum: "2d23418c718f186cecd1c81cd70315f7757a91c817b8da74fd6f04c647f4f8cc",
    statements: [
      `CREATE TABLE IF NOT EXISTS "lav_ot_historico" (
        "id" TEXT NOT NULL,
        "otId" TEXT NOT NULL,
        "numero" TEXT,
        "grupoId" TEXT,
        "parteIndice" INTEGER,
        "parteTotal" INTEGER,
        "nombreCliente" TEXT,
        "telefono" TEXT,
        "domicilio" TEXT,
        "ingresadoEn" TIMESTAMP(3) NOT NULL,
        "ingresoFecha" TEXT NOT NULL,
        "ingresoDiaSemana" INTEGER NOT NULL,
        "ingresoHoraMin" INTEGER NOT NULL,
        "urgente" BOOLEAN NOT NULL DEFAULT false,
        "fechaNecesaria" TEXT,
        "aRevisar" BOOLEAN NOT NULL DEFAULT false,
        "duracionProyectadaMin" INTEGER NOT NULL,
        "fechaAsignadaInicial" TEXT,
        "totalPrendas" INTEGER NOT NULL DEFAULT 0,
        "totalItems" INTEGER NOT NULL DEFAULT 0,
        "totalProcesos" INTEGER NOT NULL DEFAULT 0,
        "backlogCount" INTEGER,
        "backlogMin" INTEGER,
        "empezadoEn" TIMESTAMP(3),
        "terminadoEn" TIMESTAMP(3),
        "entregadoEn" TIMESTAMP(3),
        "terminadoFecha" TEXT,
        "terminadoDiaSemana" INTEGER,
        "esperaMin" INTEGER,
        "ejecucionMin" INTEGER,
        "leadTimeMin" INTEGER,
        "leadTimeEntregaMin" INTEGER,
        "errorEstimacionMin" INTEGER,
        "empleadoCargaId" TEXT,
        "empleadoTrabajoId" TEXT,
        "prendas" JSONB NOT NULL,
        "datosIA" JSONB,
        "snapshot" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "lav_ot_historico_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "lav_ot_eventos" (
        "id" TEXT NOT NULL,
        "otId" TEXT NOT NULL,
        "numero" TEXT,
        "grupoId" TEXT,
        "tipo" TEXT NOT NULL,
        "en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "empleadoId" TEXT,
        "duracionMin" INTEGER,
        "fechaAsignada" TEXT,
        "orden" INTEGER,
        "backlogCount" INTEGER,
        "backlogMin" INTEGER,
        "payload" JSONB,
        CONSTRAINT "lav_ot_eventos_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "lav_ot_historico_otId_key" ON "lav_ot_historico"("otId")`,
      `CREATE INDEX IF NOT EXISTS "lav_ot_historico_terminadoFecha_idx" ON "lav_ot_historico"("terminadoFecha")`,
      `CREATE INDEX IF NOT EXISTS "lav_ot_historico_ingresoFecha_idx" ON "lav_ot_historico"("ingresoFecha")`,
      `CREATE INDEX IF NOT EXISTS "lav_ot_historico_numero_idx" ON "lav_ot_historico"("numero")`,
      `CREATE INDEX IF NOT EXISTS "lav_ot_eventos_otId_idx" ON "lav_ot_eventos"("otId")`,
      `CREATE INDEX IF NOT EXISTS "lav_ot_eventos_tipo_idx" ON "lav_ot_eventos"("tipo")`,
      `CREATE INDEX IF NOT EXISTS "lav_ot_eventos_en_idx" ON "lav_ot_eventos"("en")`,
    ],
  },
  {
    name: "20260702010000_lav_plan_snapshot",
    checksum: "17823d759e6b53bb12af0bcd25e1a5586672dcded40959ba7b51bb151bbfe1e2",
    statements: [
      `CREATE TABLE IF NOT EXISTS "lav_plan_snapshots" (
        "id" TEXT NOT NULL,
        "snapshotEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "snapshotFecha" TEXT NOT NULL,
        "diaObjetivo" TEXT NOT NULL,
        "offsetDias" INTEGER NOT NULL,
        "capacidadMin" INTEGER NOT NULL DEFAULT 0,
        "ocupacionMin" INTEGER NOT NULL DEFAULT 0,
        "totalOts" INTEGER NOT NULL DEFAULT 0,
        "totalPrendas" INTEGER NOT NULL DEFAULT 0,
        "totalProcesos" INTEGER NOT NULL DEFAULT 0,
        "ots" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "lav_plan_snapshots_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE INDEX IF NOT EXISTS "lav_plan_snapshots_snapshotFecha_idx" ON "lav_plan_snapshots"("snapshotFecha")`,
      `CREATE INDEX IF NOT EXISTS "lav_plan_snapshots_diaObjetivo_idx" ON "lav_plan_snapshots"("diaObjetivo")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "lav_plan_snapshots_snapshotFecha_diaObjetivo_key" ON "lav_plan_snapshots"("snapshotFecha", "diaObjetivo")`,
    ],
  },
  {
    name: "20260706000000_add_nota_calendar_event",
    checksum: "83244612c98cfea7889a5f9938a754b9788b5ab400717003b18ee2a1ab8f6c20",
    statements: [
      `CREATE TABLE IF NOT EXISTS "nota_calendar_events" (
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
      )`,
      `CREATE INDEX IF NOT EXISTS "nota_calendar_events_deviceId_date_idx" ON "nota_calendar_events"("deviceId", "date")`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nota_calendar_events_deviceId_fkey') THEN
         ALTER TABLE "nota_calendar_events" ADD CONSTRAINT "nota_calendar_events_deviceId_fkey"
         FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
    ],
  },
  {
    name: "20260706120000_add_calendar_reminders",
    checksum: "a52484e9e1f5c2b0a986cc61eb0fdd78d346d79c33485c8c3f4dd2bbd386c31d",
    statements: [
      `ALTER TABLE "nota_calendar_events" ADD COLUMN IF NOT EXISTS "reminderOffsets" INTEGER[] NOT NULL DEFAULT '{}'`,
      `ALTER TABLE "nota_calendar_events" ADD COLUMN IF NOT EXISTS "firedKeys" TEXT[] NOT NULL DEFAULT '{}'`,
    ],
  },
  {
    name: "20260803000000_add_trabajo_harness",
    checksum: "60b992fee272be11c258cd7bf50856966f050227d7db738bdd3959e972523806",
    statements: [
      `CREATE TABLE IF NOT EXISTS "trabajo_items" (
        "id" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "titulo" TEXT NOT NULL DEFAULT '',
        "estado" TEXT NOT NULL DEFAULT 'pendiente',
        "orden" INTEGER NOT NULL DEFAULT 0,
        "proyecto" TEXT NOT NULL DEFAULT '',
        "pasoActual" INTEGER NOT NULL DEFAULT 0,
        "pasosTotales" INTEGER NOT NULL DEFAULT 0,
        "intentos" INTEGER NOT NULL DEFAULT 0,
        "sesionInicio" TIMESTAMP(3),
        "cuenta" TEXT,
        "motivoBloqueo" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completadoEn" TIMESTAMP(3),
        CONSTRAINT "trabajo_items_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "trabajo_prompts" (
        "id" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "tipo" TEXT NOT NULL DEFAULT 'inicial',
        "contenido" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "trabajo_prompts_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "trabajo_log_entries" (
        "id" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "tipo" TEXT NOT NULL DEFAULT 'hito',
        "texto" TEXT NOT NULL DEFAULT '',
        "paso" INTEGER,
        "cuenta" TEXT,
        "requiereIntervencion" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "trabajo_log_entries_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "trabajo_imagenes" (
        "id" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "logEntryId" TEXT,
        "promptId" TEXT,
        "url" TEXT NOT NULL,
        "pathname" TEXT NOT NULL,
        "ancho" INTEGER NOT NULL DEFAULT 0,
        "alto" INTEGER NOT NULL DEFAULT 0,
        "bytes" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "trabajo_imagenes_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "harness_cuentas" (
        "id" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "nombre" TEXT NOT NULL,
        "estado" TEXT NOT NULL DEFAULT 'activa',
        "tokensVentana" INTEGER NOT NULL DEFAULT 0,
        "techoObservado" INTEGER,
        "resetAt" TIMESTAMP(3),
        "ventanaInicio" TIMESTAMP(3),
        "ultimaSesionAt" TIMESTAMP(3),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "harness_cuentas_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "harness_estado" (
        "id" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "estado" TEXT NOT NULL DEFAULT 'detenido',
        "itemEnCursoId" TEXT,
        "sesionInicio" TIMESTAMP(3),
        "cuentaActual" TEXT,
        "limiteSesionMin" INTEGER NOT NULL DEFAULT 90,
        "actualizadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "harness_estado_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE INDEX IF NOT EXISTS "trabajo_items_deviceId_estado_orden_idx" ON "trabajo_items"("deviceId", "estado", "orden")`,
      `CREATE INDEX IF NOT EXISTS "trabajo_prompts_itemId_idx" ON "trabajo_prompts"("itemId")`,
      `CREATE INDEX IF NOT EXISTS "trabajo_log_entries_itemId_createdAt_idx" ON "trabajo_log_entries"("itemId", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "trabajo_imagenes_itemId_idx" ON "trabajo_imagenes"("itemId")`,
      `CREATE INDEX IF NOT EXISTS "trabajo_imagenes_logEntryId_idx" ON "trabajo_imagenes"("logEntryId")`,
      `CREATE INDEX IF NOT EXISTS "trabajo_imagenes_promptId_idx" ON "trabajo_imagenes"("promptId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "harness_cuentas_deviceId_nombre_key" ON "harness_cuentas"("deviceId", "nombre")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "harness_estado_deviceId_key" ON "harness_estado"("deviceId")`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_items_deviceId_fkey') THEN
         ALTER TABLE "trabajo_items" ADD CONSTRAINT "trabajo_items_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_prompts_itemId_fkey') THEN
         ALTER TABLE "trabajo_prompts" ADD CONSTRAINT "trabajo_prompts_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "trabajo_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_log_entries_itemId_fkey') THEN
         ALTER TABLE "trabajo_log_entries" ADD CONSTRAINT "trabajo_log_entries_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "trabajo_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_imagenes_itemId_fkey') THEN
         ALTER TABLE "trabajo_imagenes" ADD CONSTRAINT "trabajo_imagenes_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "trabajo_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_imagenes_logEntryId_fkey') THEN
         ALTER TABLE "trabajo_imagenes" ADD CONSTRAINT "trabajo_imagenes_logEntryId_fkey" FOREIGN KEY ("logEntryId") REFERENCES "trabajo_log_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_imagenes_promptId_fkey') THEN
         ALTER TABLE "trabajo_imagenes" ADD CONSTRAINT "trabajo_imagenes_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "trabajo_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'harness_cuentas_deviceId_fkey') THEN
         ALTER TABLE "harness_cuentas" ADD CONSTRAINT "harness_cuentas_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'harness_estado_deviceId_fkey') THEN
         ALTER TABLE "harness_estado" ADD CONSTRAINT "harness_estado_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'harness_estado_itemEnCursoId_fkey') THEN
         ALTER TABLE "harness_estado" ADD CONSTRAINT "harness_estado_itemEnCursoId_fkey" FOREIGN KEY ("itemEnCursoId") REFERENCES "trabajo_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
       END IF; END $$`,
    ],
  },
  {
    name: "20260803140000_add_trabajo_bandeja",
    checksum: "4bd0f4ee286c9ea7f58c9488a728a18f3d958f69686f995483ee472891fe6628",
    statements: [
      `CREATE TABLE IF NOT EXISTS "trabajo_bandejas" (
        "id" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "contenido" JSONB NOT NULL,
        "estado" TEXT NOT NULL DEFAULT 'vacia',
        "error" TEXT,
        "pedidoEn" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "trabajo_bandejas_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "trabajo_sugerencias" (
        "id" TEXT NOT NULL,
        "bandejaId" TEXT NOT NULL,
        "titulo" TEXT NOT NULL DEFAULT '',
        "proyecto" TEXT NOT NULL DEFAULT '',
        "desdeBid" TEXT NOT NULL,
        "hastaBid" TEXT NOT NULL,
        "orden" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "trabajo_sugerencias_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "trabajo_bandejas_deviceId_key" ON "trabajo_bandejas"("deviceId")`,
      `CREATE INDEX IF NOT EXISTS "trabajo_sugerencias_bandejaId_orden_idx" ON "trabajo_sugerencias"("bandejaId", "orden")`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_bandejas_deviceId_fkey') THEN
         ALTER TABLE "trabajo_bandejas" ADD CONSTRAINT "trabajo_bandejas_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_sugerencias_bandejaId_fkey') THEN
         ALTER TABLE "trabajo_sugerencias" ADD CONSTRAINT "trabajo_sugerencias_bandejaId_fkey" FOREIGN KEY ("bandejaId") REFERENCES "trabajo_bandejas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      // Una imagen pegada en el crudo todavía no pertenece a ningún ítem.
      `ALTER TABLE "trabajo_imagenes" ALTER COLUMN "itemId" DROP NOT NULL`,
      `ALTER TABLE "trabajo_imagenes" ADD COLUMN IF NOT EXISTS "bandejaId" TEXT`,
      `CREATE INDEX IF NOT EXISTS "trabajo_imagenes_bandejaId_idx" ON "trabajo_imagenes"("bandejaId")`,
      // El borrado de blobs consulta por pathname para no borrar uno todavía en uso.
      `CREATE INDEX IF NOT EXISTS "trabajo_imagenes_pathname_idx" ON "trabajo_imagenes"("pathname")`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_imagenes_bandejaId_fkey') THEN
         ALTER TABLE "trabajo_imagenes" ADD CONSTRAINT "trabajo_imagenes_bandejaId_fkey" FOREIGN KEY ("bandejaId") REFERENCES "trabajo_bandejas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
    ],
  },
  {
    name: "20260803160000_harness_carriles",
    checksum: "8e5292691b819b3c6f7984760b5100ddab0c92d4156fd82a81a1ce594629f4b6",
    statements: [
      `ALTER TABLE "harness_cuentas" ADD COLUMN IF NOT EXISTS "email" TEXT`,
      `ALTER TABLE "harness_cuentas" ADD COLUMN IF NOT EXISTS "habilitada" BOOLEAN NOT NULL DEFAULT true`,
      `ALTER TABLE "harness_cuentas" ADD COLUMN IF NOT EXISTS "carril" TEXT`,
      // El latido pasa a ser uno por carril. Lo que había era del de trabajo.
      `ALTER TABLE "harness_estado" ADD COLUMN IF NOT EXISTS "carril" TEXT NOT NULL DEFAULT 'trabajo'`,
      `DROP INDEX IF EXISTS "harness_estado_deviceId_key"`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "harness_estado_deviceId_carril_key" ON "harness_estado"("deviceId", "carril")`,
    ],
  },
  {
    name: "20260803180000_harness_encendido",
    checksum: "60e499b5677c77817817a0de42f450e13e80d25e141a0cbb6bdb043ee9cc0be5",
    statements: [
      `ALTER TABLE "harness_estado" ADD COLUMN IF NOT EXISTS "encendido" BOOLEAN NOT NULL DEFAULT false`,
    ],
  },
  {
    name: "20260803200000_harness_eventos",
    checksum: "620d91af26b5eb439e991d6c1d38edb9467bac630cf54f1827a8364627d404de",
    statements: [
      `CREATE TABLE IF NOT EXISTS "harness_eventos" (
        "id" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "carril" TEXT NOT NULL,
        "tipo" TEXT NOT NULL DEFAULT 'info',
        "texto" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "harness_eventos_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE INDEX IF NOT EXISTS "harness_eventos_deviceId_createdAt_idx" ON "harness_eventos"("deviceId", "createdAt")`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'harness_eventos_deviceId_fkey') THEN
         ALTER TABLE "harness_eventos" ADD CONSTRAINT "harness_eventos_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
    ],
  },
  {
    name: "20260803220000_consola",
    checksum: "2fce111cfc9ba5884ad0ccdef7233b27612e46ab76fbdbab6c82a9b02cea36d1",
    statements: [
      `CREATE TABLE IF NOT EXISTS "consola_sesiones" (
        "id" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "sessionId" TEXT NOT NULL,
        "titulo" TEXT NOT NULL DEFAULT '',
        "cuenta" TEXT,
        "estado" TEXT NOT NULL DEFAULT 'idle',
        "error" TEXT,
        "directorio" TEXT NOT NULL DEFAULT '',
        "archivada" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "consola_sesiones_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "consola_mensajes" (
        "id" TEXT NOT NULL,
        "sesionId" TEXT NOT NULL,
        "rol" TEXT NOT NULL DEFAULT 'usuario',
        "texto" TEXT NOT NULL DEFAULT '',
        "parcial" BOOLEAN NOT NULL DEFAULT false,
        "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "consola_mensajes_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "consola_capturas" (
        "id" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "pathname" TEXT NOT NULL,
        "ancho" INTEGER NOT NULL DEFAULT 0,
        "alto" INTEGER NOT NULL DEFAULT 0,
        "estado" TEXT NOT NULL DEFAULT 'lista',
        "pedidaEn" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "consola_capturas_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "consola_sesiones_sessionId_key" ON "consola_sesiones"("sessionId")`,
      `CREATE INDEX IF NOT EXISTS "consola_sesiones_deviceId_archivada_updatedAt_idx" ON "consola_sesiones"("deviceId", "archivada", "updatedAt")`,
      `CREATE INDEX IF NOT EXISTS "consola_mensajes_sesionId_createdAt_idx" ON "consola_mensajes"("sesionId", "createdAt")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "consola_capturas_deviceId_key" ON "consola_capturas"("deviceId")`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consola_sesiones_deviceId_fkey') THEN
         ALTER TABLE "consola_sesiones" ADD CONSTRAINT "consola_sesiones_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consola_mensajes_sesionId_fkey') THEN
         ALTER TABLE "consola_mensajes" ADD CONSTRAINT "consola_mensajes_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "consola_sesiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consola_capturas_deviceId_fkey') THEN
         ALTER TABLE "consola_capturas" ADD CONSTRAINT "consola_capturas_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
    ],
  },
  {
    name: "20260805210000_add_trabajo_pedido_archivo",
    checksum: "a5bb9750ce5487f17b38fdc1fde065aada9e81b65804ceaa854a3bc13b703b8e",
    statements: [
      `CREATE TABLE IF NOT EXISTS "trabajo_pedidos_archivo" (
        "id" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "ruta" TEXT NOT NULL,
        "nombre" TEXT NOT NULL DEFAULT '',
        "alcance" TEXT NOT NULL DEFAULT '',
        "estado" TEXT NOT NULL DEFAULT 'pendiente',
        "error" TEXT,
        "itemsCreados" INTEGER NOT NULL DEFAULT 0,
        "pedidoEn" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "trabajo_pedidos_archivo_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE INDEX IF NOT EXISTS "trabajo_pedidos_archivo_deviceId_estado_idx" ON "trabajo_pedidos_archivo"("deviceId", "estado")`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_pedidos_archivo_deviceId_fkey') THEN
         ALTER TABLE "trabajo_pedidos_archivo" ADD CONSTRAINT "trabajo_pedidos_archivo_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       END IF; END $$`,
      `ALTER TABLE "trabajo_items" ADD COLUMN IF NOT EXISTS "fuenteArchivo" TEXT`,
      `ALTER TABLE "trabajo_items" ADD COLUMN IF NOT EXISTS "fuenteAncla" TEXT`,
      `ALTER TABLE "trabajo_items" ADD COLUMN IF NOT EXISTS "pedidoArchivoId" TEXT`,
      `CREATE INDEX IF NOT EXISTS "trabajo_items_pedidoArchivoId_idx" ON "trabajo_items"("pedidoArchivoId")`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trabajo_items_pedidoArchivoId_fkey') THEN
         ALTER TABLE "trabajo_items" ADD CONSTRAINT "trabajo_items_pedidoArchivoId_fkey" FOREIGN KEY ("pedidoArchivoId") REFERENCES "trabajo_pedidos_archivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
       END IF; END $$`,
    ],
  },
  {
    name: "20260806140000_add_fuente_huella",
    checksum: "7f649ebc80e0327edf2bfabd4c420ebee52fe818da0d054dc87eae26fd73e98a",
    statements: [
      `ALTER TABLE "trabajo_items" ADD COLUMN IF NOT EXISTS "fuenteHuella" TEXT`,
      `ALTER TABLE "trabajo_items" ADD COLUMN IF NOT EXISTS "fuenteCambiada" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "trabajo_items" ADD COLUMN IF NOT EXISTS "fuenteRevisadaEn" TIMESTAMP(3)`,
    ],
  },
];

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultados: string[] = [];
  try {
    for (const migration of MIGRATIONS) {
      // Saltar si ya está aplicada.
      const yaAplicada = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE migration_name = ${migration.name}
      `.then((r) => Number(r[0]?.count ?? 0) > 0).catch(() => false);

      if (yaAplicada) {
        resultados.push(`[SKIP] ${migration.name}`);
        continue;
      }

      for (const sql of migration.statements) {
        await prisma.$executeRawUnsafe(sql);
        resultados.push(`[OK] ${sql.slice(0, 60).replace(/\s+/g, " ")}`);
      }

      await prisma.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES ($1, $2, now(), $3, NULL, NULL, now(), 1)`,
        randomUUID(),
        migration.checksum,
        migration.name,
      );
      resultados.push(`[MIGRATED] ${migration.name}`);
    }

    return NextResponse.json({ ok: true, resultados });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), resultados },
      { status: 500 },
    );
  }
}
