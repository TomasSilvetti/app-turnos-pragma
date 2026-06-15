-- Recordatorios recurrentes por intervalo (ej: cada 1h dentro de una ventana horaria).
ALTER TABLE "nota_reminders" ADD COLUMN IF NOT EXISTS "intervalMinutes" INTEGER;
ALTER TABLE "nota_reminders" ADD COLUMN IF NOT EXISTS "endTime" TEXT;
