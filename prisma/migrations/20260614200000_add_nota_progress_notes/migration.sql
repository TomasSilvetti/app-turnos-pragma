-- CreateTable
CREATE TABLE "nota_progress_notes" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nota_progress_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nota_progress_notes_progressId_idx" ON "nota_progress_notes"("progressId");

-- AddForeignKey
ALTER TABLE "nota_progress_notes" ADD CONSTRAINT "nota_progress_notes_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "nota_progresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cada "puntito" existente (count) pasa a tener una mini nota vacía,
-- para que el listado del modal coincida con los puntitos ya mostrados.
INSERT INTO "nota_progress_notes" ("id", "progressId", "text", "createdAt")
SELECT
    gen_random_uuid()::text,
    p."id",
    '',
    NOW() + (g * interval '1 millisecond')
FROM "nota_progresses" p
CROSS JOIN LATERAL generate_series(1, p."count") AS g
WHERE p."count" > 0;
