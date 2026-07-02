-- CreateTable
CREATE TABLE "lav_plan_snapshots" (
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
);

-- CreateIndex
CREATE INDEX "lav_plan_snapshots_snapshotFecha_idx" ON "lav_plan_snapshots"("snapshotFecha");

-- CreateIndex
CREATE INDEX "lav_plan_snapshots_diaObjetivo_idx" ON "lav_plan_snapshots"("diaObjetivo");

-- CreateIndex
CREATE UNIQUE INDEX "lav_plan_snapshots_snapshotFecha_diaObjetivo_key" ON "lav_plan_snapshots"("snapshotFecha", "diaObjetivo");
