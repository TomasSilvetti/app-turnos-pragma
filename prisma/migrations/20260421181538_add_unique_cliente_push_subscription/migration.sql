/*
  Warnings:

  - A unique constraint covering the columns `[clienteId,endpoint]` on the table `cliente_push_subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "cliente_push_subscriptions_clienteId_endpoint_key" ON "cliente_push_subscriptions"("clienteId", "endpoint");
