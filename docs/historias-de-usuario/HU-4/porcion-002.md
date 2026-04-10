# porcion-002 — Página pública `/p/[slug]` — layout con info del negocio [FRONT]

**Historia de usuario:** HU-4: Consulta pública de turnos disponibles por prestador
**Par:** —
**Tipo:** FRONT
**Prerequisitos:** Ninguno
**Estado:** completada

## Descripción

Crear la página pública accesible en `/p/[slug]` que muestra el nombre y logo del negocio del prestador. Es el contenedor base donde luego se integrarán el calendario y las cards de turnos.

## Ejemplo de uso

Un cliente accede al link `miapp.com/p/peluqueria-ana` y ve el logo y el nombre "Peluquería Ana" en la parte superior de la página, sin necesidad de iniciar sesión.

## Criterios de aceptación

- [ ] La ruta `/p/[slug]` existe y es accesible sin autenticación
- [ ] Se muestra el nombre del negocio correspondiente al slug
- [ ] Si el negocio tiene logo, se muestra la imagen; si no, se muestra un placeholder
- [ ] La página tiene un layout limpio que deja espacio para el calendario y los turnos
- [ ] El middleware de autenticación no bloquea esta ruta
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El componente renderiza el nombre del negocio recibido como prop
- [ ] Si `logoUrl` es null, el componente renderiza el placeholder sin errores
- [ ] El layout aplica las clases CSS correctas para el contenedor principal

### Pruebas de integración

- [ ] Al acceder a `/p/[slug]` con un slug válido, la página carga y muestra el nombre del negocio
- [ ] La página responde con status 200 sin cabeceras de autenticación requerida
