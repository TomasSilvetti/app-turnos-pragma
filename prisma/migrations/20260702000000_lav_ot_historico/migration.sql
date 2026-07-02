-- CreateTable
CREATE TABLE "lav_ot_historico" (
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
);

-- CreateTable
CREATE TABLE "lav_ot_eventos" (
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
);

-- CreateIndex
CREATE UNIQUE INDEX "lav_ot_historico_otId_key" ON "lav_ot_historico"("otId");

-- CreateIndex
CREATE INDEX "lav_ot_historico_terminadoFecha_idx" ON "lav_ot_historico"("terminadoFecha");

-- CreateIndex
CREATE INDEX "lav_ot_historico_ingresoFecha_idx" ON "lav_ot_historico"("ingresoFecha");

-- CreateIndex
CREATE INDEX "lav_ot_historico_numero_idx" ON "lav_ot_historico"("numero");

-- CreateIndex
CREATE INDEX "lav_ot_eventos_otId_idx" ON "lav_ot_eventos"("otId");

-- CreateIndex
CREATE INDEX "lav_ot_eventos_tipo_idx" ON "lav_ot_eventos"("tipo");

-- CreateIndex
CREATE INDEX "lav_ot_eventos_en_idx" ON "lav_ot_eventos"("en");
