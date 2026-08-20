-- Teclas sueltas (Esc) además de texto, para interrumpir a Claude Code desde el
-- celular. Cuando viene una tecla, "texto" se guarda vacío.
ALTER TABLE "consola_envios" ADD COLUMN IF NOT EXISTS "tecla" TEXT;
