# porcion-002 — Configuración base de NextAuth v5 [BACK]

**Estado:** ✅ Completada
**Completada el:** 2026-04-09

**Historia de usuario:** HU-1: Autenticación de prestadores de servicio
**Par:** —
**Tipo:** BACK
**Prerequisitos:** porcion-001

## Descripción

Instalar y configurar NextAuth v5 en el proyecto con la estructura base que soporte el proveedor `Credentials` y deje preparada la extensión futura del proveedor `Google`, sin implementar aún los flujos de registro o login.

## Ejemplo de uso

Una vez lista esta porción, el proyecto tiene el archivo `auth.ts` (o equivalente) con NextAuth inicializado, las rutas de API de NextAuth funcionando, y la sesión accesible desde el servidor y el cliente. Las porciones de login y registro pueden construirse sobre esta base.

## Criterios de aceptación

- [ ] NextAuth v5 está instalado y configurado en el proyecto
- [ ] Existe un archivo de configuración central de NextAuth (`auth.ts` o `auth.config.ts`) que define el proveedor `Credentials` (vacío por ahora) y deja espacio para agregar `Google` sin refactoring
- [ ] Las rutas de NextAuth (`/api/auth/[...nextauth]`) responden correctamente
- [ ] La sesión es accesible desde Server Components mediante `auth()` y desde Client Components mediante `useSession()`
- [ ] Las variables de entorno necesarias (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`) están documentadas en `.env.example`

## Pruebas

### Pruebas unitarias

- [ ] La función `auth()` retorna `null` cuando no hay sesión activa
- [ ] La configuración de NextAuth exporta correctamente el objeto con `handlers`, `auth`, `signIn` y `signOut`

### Pruebas de integración

- [ ] `GET /api/auth/session` devuelve `{}` cuando no hay sesión activa (sin lanzar error 500)
- [ ] `GET /api/auth/providers` devuelve el proveedor `credentials` en la lista de proveedores disponibles
