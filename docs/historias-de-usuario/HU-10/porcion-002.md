# porcion-002 — Sidebar: ítem Finanzas + página base [FRONT]

**Historia de usuario:** HU-10: Módulo de Finanzas
**Par:** —
**Tipo:** FRONT
**Prerequisitos:** Ninguno
**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Agregar el ítem "Finanzas" al sidebar del panel de administración y crear la página base en la ruta `/dashboard/finanzas` con su estructura visual vacía (título y contenedor principal), lista para recibir los componentes de las porciones siguientes.

## Ejemplo de uso

El prestador ve en el sidebar un nuevo ítem "Finanzas" con su ícono. Al hacer clic, es llevado a `/dashboard/finanzas` donde aparece el título "Finanzas" y el layout base de la página.

## Criterios de aceptación

- [ ] El ítem "Finanzas" aparece en el sidebar con un ícono de Material Symbols (`payments` o similar)
- [ ] El ítem se marca como activo cuando la ruta actual es `/dashboard/finanzas`
- [ ] Al hacer clic navega correctamente a `/dashboard/finanzas`
- [ ] La página `/dashboard/finanzas` renderiza sin errores con un título visible
- [ ] La página hereda el layout del dashboard (sidebar, header, etc.)
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El ítem "Finanzas" está presente en el array `navItems` del layout con `href: "/dashboard/finanzas"`
- [ ] La clase `active` se aplica al ítem cuando `pathname === "/dashboard/finanzas"`

### Pruebas de integración

- [ ] Navegando a `/dashboard/finanzas` se renderiza la página sin errores 500
- [ ] El sidebar muestra el ítem activo correctamente al estar en esa ruta
