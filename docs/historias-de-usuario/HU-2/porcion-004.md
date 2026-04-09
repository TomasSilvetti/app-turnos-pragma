# porcion-004 — Guard de redirección al primer acceso [FRONT]

**Estado:** completada

**Historia de usuario:** HU-2: Gestión de perfil del negocio
**Par:** porcion-005
**Tipo:** FRONT
**Prerequisitos:** Ninguno

## Descripción

Implementar la lógica de redirección que detecta cuando un prestador autenticado aún no tiene perfil de negocio configurado y lo envía obligatoriamente a la página de configuración de perfil antes de que pueda acceder al panel principal.

## Ejemplo de uso

El prestador recién registrado inicia sesión. Al intentar acceder a `/dashboard`, el sistema detecta que no tiene perfil configurado y lo redirige automáticamente a `/onboarding/perfil`. Una vez que completa el perfil, puede acceder al panel sin interrupciones.

## Criterios de aceptación

- [ ] Al acceder a cualquier ruta del panel (`/dashboard/*`), si el prestador no tiene perfil configurado, es redirigido a `/onboarding/perfil`
- [ ] Un prestador con perfil configurado puede acceder al panel sin redirección
- [ ] Acceder directamente a `/onboarding/perfil` cuando ya se tiene perfil redirige al panel principal
- [ ] La redirección ocurre antes de renderizar cualquier contenido del panel
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El guard redirige a `/onboarding/perfil` cuando el estado de perfil es "no configurado"
- [ ] El guard no redirige cuando el estado de perfil es "configurado"
- [ ] Acceder a `/onboarding/perfil` con perfil ya configurado redirige al panel

### Pruebas de integración

- [ ] Un prestador autenticado sin perfil que navega a `/dashboard` es redirigido a `/onboarding/perfil`
- [ ] Un prestador autenticado con perfil que navega a `/dashboard` accede correctamente sin redirección
- [ ] El estado de "perfil configurado" se obtiene consultando el endpoint de porcion-005 y el resultado se cachea para evitar múltiples llamadas durante la sesión
