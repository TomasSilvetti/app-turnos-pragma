-- Credenciales de admin para lavanderia
ALTER TABLE "lav_empleados" ADD COLUMN "email" TEXT;
ALTER TABLE "lav_empleados" ADD COLUMN "hashedPassword" TEXT;

CREATE UNIQUE INDEX "lav_empleados_email_key" ON "lav_empleados"("email");

-- Tokens de recuperacion de contraseña del admin
CREATE TABLE "lav_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lav_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lav_password_reset_tokens_token_key" ON "lav_password_reset_tokens"("token");

ALTER TABLE "lav_password_reset_tokens" ADD CONSTRAINT "lav_password_reset_tokens_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "lav_empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
