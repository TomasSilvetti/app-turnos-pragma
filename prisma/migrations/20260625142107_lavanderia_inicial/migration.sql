-- CreateTable
CREATE TABLE "lav_empleados" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lav_empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lav_procesos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lav_procesos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lav_prendas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lav_prendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lav_duraciones" (
    "id" TEXT NOT NULL,
    "prendaId" TEXT NOT NULL,
    "procesoId" TEXT NOT NULL,
    "minutos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lav_duraciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lav_turno_config" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "diasSemana" INTEGER[],
    "habilitado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lav_turno_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lav_dia_extra" (
    "id" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lav_dia_extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lav_ots" (
    "id" TEXT NOT NULL,
    "numero" TEXT,
    "nombreCliente" TEXT,
    "telefono" TEXT,
    "domicilio" TEXT,
    "total" DOUBLE PRECISION,
    "fechaTicket" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fechaAsignada" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "duracionMin" INTEGER NOT NULL DEFAULT 0,
    "aRevisar" BOOLEAN NOT NULL DEFAULT false,
    "empleadoCargaId" TEXT,
    "empleadoTrabajoId" TEXT,
    "empezadoEn" TIMESTAMP(3),
    "terminadoEn" TIMESTAMP(3),
    "datosIA" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lav_ots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lav_ot_items" (
    "id" TEXT NOT NULL,
    "otId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "prendaId" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "procesos" TEXT[],
    "duracionMin" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lav_ot_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lav_duraciones_prendaId_idx" ON "lav_duraciones"("prendaId");

-- CreateIndex
CREATE INDEX "lav_duraciones_procesoId_idx" ON "lav_duraciones"("procesoId");

-- CreateIndex
CREATE UNIQUE INDEX "lav_duraciones_prendaId_procesoId_key" ON "lav_duraciones"("prendaId", "procesoId");

-- CreateIndex
CREATE UNIQUE INDEX "lav_turno_config_tipo_key" ON "lav_turno_config"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "lav_dia_extra_fecha_key" ON "lav_dia_extra"("fecha");

-- CreateIndex
CREATE INDEX "lav_ots_fechaAsignada_idx" ON "lav_ots"("fechaAsignada");

-- CreateIndex
CREATE INDEX "lav_ots_estado_idx" ON "lav_ots"("estado");

-- CreateIndex
CREATE INDEX "lav_ot_items_otId_idx" ON "lav_ot_items"("otId");

-- AddForeignKey
ALTER TABLE "lav_duraciones" ADD CONSTRAINT "lav_duraciones_prendaId_fkey" FOREIGN KEY ("prendaId") REFERENCES "lav_prendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_duraciones" ADD CONSTRAINT "lav_duraciones_procesoId_fkey" FOREIGN KEY ("procesoId") REFERENCES "lav_procesos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_ots" ADD CONSTRAINT "lav_ots_empleadoCargaId_fkey" FOREIGN KEY ("empleadoCargaId") REFERENCES "lav_empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_ots" ADD CONSTRAINT "lav_ots_empleadoTrabajoId_fkey" FOREIGN KEY ("empleadoTrabajoId") REFERENCES "lav_empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_ot_items" ADD CONSTRAINT "lav_ot_items_otId_fkey" FOREIGN KEY ("otId") REFERENCES "lav_ots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_ot_items" ADD CONSTRAINT "lav_ot_items_prendaId_fkey" FOREIGN KEY ("prendaId") REFERENCES "lav_prendas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
