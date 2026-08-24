-- Saca de esta app el modulo de trabajo y consola.
--
-- POR QUE: el modulo se mudo a pragmaMonitor. Las terminales trabajan sobre
-- cualquier repo (construia, pragmastore, el propio monitor), asi que vivir
-- adentro de la app de turnos las ataba a la unica app que no tenia nada que ver
-- con ellas. Tener las dos copias andando a la vez era peor todavia: dos colas
-- distintas para el mismo trabajo.
--
-- LOS DATOS YA ESTAN DEL OTRO LADO. Se migraron 18 tareas con sus 18 prompts, 97
-- entradas de log, 45 imagenes y las 3 cuentas OAuth con sus mails. Las imagenes
-- no se copiaron: el store de Vercel Blob es el mismo (`harness-trabajo`) y las
-- URLs siguen siendo validas, asi que lo unico que se mudo fueron las filas que
-- apuntan a ellas. Ademas quedo un respaldo en JSON de todas estas tablas, fuera
-- del repositorio.
--
-- Lo que NO se migro, porque no significa nada afuera de esta app: dos bandejas
-- de crudo vacias, dos pedidos de archivo ya procesados, el latido del harness y
-- sus eventos, y el estado de las terminales del agente viejo (el agente nuevo
-- lo reconstruye en su primer censo).
--
-- CASCADE porque estas tablas se referencian entre si y una a nota_devices: sin
-- el, el orden del DROP tendria que ser exacto y cualquier cambio futuro en las
-- relaciones romperia esta migracion en produccion.

DROP TABLE IF EXISTS "consola_envios" CASCADE;
DROP TABLE IF EXISTS "consola_terminales" CASCADE;
DROP TABLE IF EXISTS "consola_capturas" CASCADE;
DROP TABLE IF EXISTS "consola_mensajes" CASCADE;
DROP TABLE IF EXISTS "consola_sesiones" CASCADE;

DROP TABLE IF EXISTS "harness_eventos" CASCADE;
DROP TABLE IF EXISTS "harness_estado" CASCADE;
DROP TABLE IF EXISTS "harness_cuentas" CASCADE;

DROP TABLE IF EXISTS "trabajo_imagenes" CASCADE;
DROP TABLE IF EXISTS "trabajo_log_entries" CASCADE;
DROP TABLE IF EXISTS "trabajo_prompts" CASCADE;
DROP TABLE IF EXISTS "trabajo_sugerencias" CASCADE;
DROP TABLE IF EXISTS "trabajo_bandejas" CASCADE;
DROP TABLE IF EXISTS "trabajo_items" CASCADE;
DROP TABLE IF EXISTS "trabajo_pedidos_archivo" CASCADE;
