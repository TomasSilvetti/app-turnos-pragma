-- CreateTable: mini notas dentro de un progreso (registros de cada toque)
CREATE TABLE IF NOT EXISTS "nota_progress_notes" (
  "id" TEXT NOT NULL,
  "progressId" TEXT NOT NULL,
  "text" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nota_progress_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "nota_progress_notes_progressId_idx" ON "nota_progress_notes"("progressId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nota_progress_notes_progressId_fkey') THEN
    ALTER TABLE "nota_progress_notes" ADD CONSTRAINT "nota_progress_notes_progressId_fkey"
    FOREIGN KEY ("progressId") REFERENCES "nota_progresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
