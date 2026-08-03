-- Botón de encendido por carril: la app deja el deseo, el vigía lo obedece.

ALTER TABLE "harness_estado" ADD COLUMN IF NOT EXISTS "encendido" BOOLEAN NOT NULL DEFAULT false;
