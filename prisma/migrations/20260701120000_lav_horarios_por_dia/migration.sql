-- Horarios por día de la semana: se reestructura lav_turno_config (una fila por
-- (diaSemana, tipo)) y se agrega lav_dia_config (toggle "atiende" por día).
-- La config es chica y regenerable, así que se limpia y se re-siembra con el
-- estado deseado (lun-vie completo + sábado 10-14).

-- CreateTable
CREATE TABLE "lav_dia_config" (
    "diaSemana" INTEGER NOT NULL,
    "atiende" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "lav_dia_config_pkey" PRIMARY KEY ("diaSemana")
);

-- Reestructurar lav_turno_config: de un horario global por tipo a uno por día.
DELETE FROM "lav_turno_config";

DROP INDEX IF EXISTS "lav_turno_config_tipo_key";

ALTER TABLE "lav_turno_config" DROP COLUMN "diasSemana";
ALTER TABLE "lav_turno_config" ADD COLUMN "diaSemana" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "lav_turno_config" ALTER COLUMN "diaSemana" DROP DEFAULT;

CREATE UNIQUE INDEX "lav_turno_config_diaSemana_tipo_key" ON "lav_turno_config"("diaSemana", "tipo");

-- Seed: días que atiende (dom cerrado, lun-sáb abierto).
INSERT INTO "lav_dia_config" ("diaSemana", "atiende") VALUES
    (0, false),
    (1, true),
    (2, true),
    (3, true),
    (4, true),
    (5, true),
    (6, true);

-- Seed: turnos por día. Lun-vie: mañana 08-14, tarde 17-21, especial 14-17.
-- Sábado: solo mañana 10-14.
INSERT INTO "lav_turno_config" ("id", "diaSemana", "tipo", "horaInicio", "horaFin", "habilitado") VALUES
    (gen_random_uuid()::text, 1, 'manana', '08:00', '14:00', true),
    (gen_random_uuid()::text, 1, 'tarde',  '17:00', '21:00', true),
    (gen_random_uuid()::text, 1, 'extra',  '14:00', '17:00', true),
    (gen_random_uuid()::text, 2, 'manana', '08:00', '14:00', true),
    (gen_random_uuid()::text, 2, 'tarde',  '17:00', '21:00', true),
    (gen_random_uuid()::text, 2, 'extra',  '14:00', '17:00', true),
    (gen_random_uuid()::text, 3, 'manana', '08:00', '14:00', true),
    (gen_random_uuid()::text, 3, 'tarde',  '17:00', '21:00', true),
    (gen_random_uuid()::text, 3, 'extra',  '14:00', '17:00', true),
    (gen_random_uuid()::text, 4, 'manana', '08:00', '14:00', true),
    (gen_random_uuid()::text, 4, 'tarde',  '17:00', '21:00', true),
    (gen_random_uuid()::text, 4, 'extra',  '14:00', '17:00', true),
    (gen_random_uuid()::text, 5, 'manana', '08:00', '14:00', true),
    (gen_random_uuid()::text, 5, 'tarde',  '17:00', '21:00', true),
    (gen_random_uuid()::text, 5, 'extra',  '14:00', '17:00', true),
    (gen_random_uuid()::text, 6, 'manana', '10:00', '14:00', true);
