-- Prenda creada desde la carga por foto (caso "varios"): falta cargarle los minutos.
ALTER TABLE "lav_prendas" ADD COLUMN IF NOT EXISTS "incompleta" BOOLEAN NOT NULL DEFAULT false;
