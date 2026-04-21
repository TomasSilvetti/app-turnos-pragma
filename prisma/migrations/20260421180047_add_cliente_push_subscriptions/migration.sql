-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "notificacionesActivadas" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "cliente_push_subscriptions" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cliente_push_subscriptions" ADD CONSTRAINT "cliente_push_subscriptions_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
