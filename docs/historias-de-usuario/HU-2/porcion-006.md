# porcion-006 — Página pública del negocio — vista [FRONT]

**Historia de usuario:** HU-2: Gestión de perfil del negocio
**Par:** porcion-007
**Tipo:** FRONT
**Prerequisitos:** Ninguno
**Estado:** ✅ Completada
**Completada el:** 2026-04-09

## Descripción

Crear la página pública accesible en `/turnos/[slug]` que muestra la información del negocio (nombre, logo, dirección, teléfono) a cualquier visitante sin necesidad de iniciar sesión. Es el punto de entrada para que los clientes del prestador reserven turnos.

## Ejemplo de uso

Un cliente recibe el link `https://app.com/turnos/peluqueria-sol`, lo abre sin estar logueado y ve el logo, nombre, dirección y teléfono de la peluquería, junto con la opción de reservar un turno.

## Criterios de aceptación

- [ ] La ruta `/turnos/[slug]` es accesible sin autenticación
- [ ] La página muestra el logo, nombre del negocio, dirección y teléfono obtenidos del endpoint
- [ ] Si el slug no corresponde a ningún negocio, se muestra una página de "Negocio no encontrado" con código 404
- [ ] La página muestra un estado de carga mientras obtiene los datos del negocio
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] Con datos válidos del negocio, el componente renderiza el nombre, logo, dirección y teléfono
- [ ] Con estado de carga activo, el componente muestra un skeleton o indicador de carga
- [ ] Cuando el negocio no existe (404), el componente renderiza el mensaje "Negocio no encontrado"

### Pruebas de integración

- [ ] Navegar a `/turnos/peluqueria-sol` sin sesión activa muestra los datos del negocio correctamente
- [ ] Navegar a `/turnos/slug-inexistente` muestra la página de 404
- [ ] Los datos mostrados en la página corresponden exactamente a los devueltos por el endpoint de porcion-007
