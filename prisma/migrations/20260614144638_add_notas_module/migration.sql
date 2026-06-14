-- CreateTable
CREATE TABLE "nota_devices" (
    "id" TEXT NOT NULL,
    "recoveryPhrase" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nota_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nota_reminders" (
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
);

-- CreateTable
CREATE TABLE "nota_progresses" (
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
);

-- CreateTable
CREATE TABLE "nota_push_subscriptions" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nota_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nota_devices_recoveryPhrase_key" ON "nota_devices"("recoveryPhrase");

-- CreateIndex
CREATE INDEX "notas_deviceId_idx" ON "notas"("deviceId");

-- CreateIndex
CREATE INDEX "nota_reminders_deviceId_enabled_idx" ON "nota_reminders"("deviceId", "enabled");

-- CreateIndex
CREATE INDEX "nota_reminders_notaId_idx" ON "nota_reminders"("notaId");

-- CreateIndex
CREATE INDEX "nota_progresses_notaId_idx" ON "nota_progresses"("notaId");

-- CreateIndex
CREATE UNIQUE INDEX "nota_push_subscriptions_endpoint_key" ON "nota_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "nota_push_subscriptions_deviceId_idx" ON "nota_push_subscriptions"("deviceId");

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_reminders" ADD CONSTRAINT "nota_reminders_notaId_fkey" FOREIGN KEY ("notaId") REFERENCES "notas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_progresses" ADD CONSTRAINT "nota_progresses_notaId_fkey" FOREIGN KEY ("notaId") REFERENCES "notas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nota_push_subscriptions" ADD CONSTRAINT "nota_push_subscriptions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "nota_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

