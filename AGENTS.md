<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Reglas de trabajo — App de Notas

## Siempre pushear a `main` al terminar

Después de cualquier implementación en la app de notas (o en general), hacer push a `main`:

```bash
git push origin HEAD:main
```

## Migraciones de la app de notas en producción

Vercel **no corre `prisma migrate deploy`** automáticamente. Cada vez que se agrega un modelo o se altera la tabla de notas, hay que:

1. Agregar los statements idempotentes al endpoint `/api/notas/aplicar-migracion/route.ts`
2. Pushear a `main`
3. Esperar el deploy (Status: Ready en Vercel)
4. Correr la migración contra producción:

```bash
curl -s -X POST "https://turnos.pragmastudio.net/api/notas/aplicar-migracion?secret=6bacd58e8e611598974fa0e3f8bf1a8b4568d8053dffde4e"
```

### Datos del endpoint de migración

- **URL prod:** `https://turnos.pragmastudio.net`
- **Secret:** `6bacd58e8e611598974fa0e3f8bf1a8b4568d8053dffde4e`
- **Endpoint:** `POST /api/notas/aplicar-migracion?secret=<secret>`
- **Archivo:** `src/app/api/notas/aplicar-migracion/route.ts`

El endpoint es idempotente: las migraciones ya aplicadas devuelven `[SKIP]`, las nuevas `[MIGRATED]`.

### Cómo agregar una nueva migración

1. Crear el archivo en `prisma/migrations/<timestamp>_<nombre>/migration.sql`
2. Calcular su checksum: `sha256sum prisma/migrations/<timestamp>_<nombre>/migration.sql`
3. Agregar un bloque `Migration` al array `MIGRATIONS` en `aplicar-migracion/route.ts`
4. Todos los SQL deben ser **idempotentes** (`IF NOT EXISTS`, `IF EXISTS`, `DO $$ BEGIN ... END $$`)
5. Pushear y correr el endpoint

