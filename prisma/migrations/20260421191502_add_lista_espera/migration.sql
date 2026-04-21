-- CreateEnum
CREATE TYPE "EstadoListaEspera" AS ENUM ('activa', 'notificada', 'expirada');

-- CreateTable
CREATE TABLE "lista_espera" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "serviceProviderId" TEXT NOT NULL,
    "posicion" INTEGER NOT NULL,
    "estado" "EstadoListaEspera" NOT NULL DEFAULT 'activa',
    "bookingIdRespaldo" TEXT,
    "cualquierVacante" BOOLEAN NOT NULL DEFAULT false,
    "notificadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lista_espera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilidad_lista_espera" (
    "id" TEXT NOT NULL,
    "listaEsperaId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,

    CONSTRAINT "disponibilidad_lista_espera_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lista_espera_clienteId_serviceProviderId_key" ON "lista_espera"("clienteId", "serviceProviderId");

-- AddForeignKey
ALTER TABLE "lista_espera" ADD CONSTRAINT "lista_espera_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_espera" ADD CONSTRAINT "lista_espera_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_espera" ADD CONSTRAINT "lista_espera_bookingIdRespaldo_fkey" FOREIGN KEY ("bookingIdRespaldo") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilidad_lista_espera" ADD CONSTRAINT "disponibilidad_lista_espera_listaEsperaId_fkey" FOREIGN KEY ("listaEsperaId") REFERENCES "lista_espera"("id") ON DELETE CASCADE ON UPDATE CASCADE;
