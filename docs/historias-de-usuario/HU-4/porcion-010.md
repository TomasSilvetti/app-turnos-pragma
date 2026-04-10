# porcion-010 — Página 404 para slug inexistente [FRONT]

**Historia de usuario:** HU-4: Consulta pública de turnos disponibles por prestador
**Par:** —
**Tipo:** FRONT
**Prerequisitos:** porcion-002

## Descripción

Mostrar una página de error clara cuando el cliente accede a un link con un slug que no corresponde a ningún negocio registrado en el sistema.

## Ejemplo de uso

El cliente accede a `miapp.com/p/negocio-que-no-existe` y ve una página con el mensaje: "Este negocio no existe o el link es incorrecto", sin que la aplicación rompa.

## Criterios de aceptación

- [ ] Al acceder a `/p/[slug]` con un slug inexistente, se muestra una página de error con mensaje claro
- [ ] El mensaje es comprensible para un usuario no técnico (ej: "No encontramos este negocio")
- [ ] La página no muestra stack traces ni mensajes de error técnicos
- [ ] La página ofrece alguna acción al usuario (ej: link a la página principal o instrucción de contactar al prestador)
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El componente de error renderiza el mensaje configurado sin errores
- [ ] El componente renderiza el link o botón de acción correctamente

### Pruebas de integración

- [ ] Al acceder a `/p/slug-inexistente`, el servidor retorna 404 y el cliente renderiza la página de error
- [ ] La página de error no expone información interna del sistema (sin stack, sin queries SQL)
