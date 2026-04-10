# porcion-005 — ScheduleConfigList: conectar tipos de turno al modal [FRONT]

**Historia de usuario:** HU-9
**Par:** —
**Tipo:** FRONT
**Prerequisitos:** Ninguno (puede desarrollarse en paralelo)
**Estado:** pendiente

## Descripción

Conectar los tipos de turno del negocio al modal de creación/edición de configuración de horario.

El componente `ScheduleConfigModal` ya tiene la UI para seleccionar tipos de turno (sección "Tipos de turno disponibles" con checkboxes). El problema es que el componente contenedor (`ScheduleConfigList`) no está pasando los service types ni cargándolos.

## Cambios

**Archivo:** `src/components/schedule-config/ScheduleConfigList.tsx`

1. Al montar el componente, hacer un fetch a `GET /api/service-types` (o la ruta equivalente del proyecto) para obtener los tipos de turno del negocio.
2. Pasar el array de service types al prop `serviceTypes` del `ScheduleConfigModal`.
3. Verificar que la respuesta de `GET /api/schedule-configs` (o la ruta usada) incluya `serviceTypeIds` para pre-cargar los tipos asociados al editar.

> **Nota antes de implementar:** leer `ScheduleConfigList.tsx` para confirmar:
> - Qué ruta usa para fetch de schedule configs (y si ya incluye `serviceTypes` en la respuesta)
> - Qué ruta existe para obtener service types del negocio autenticado
> - Cómo se pasa actualmente `serviceTypes` al modal (puede estar hardcodeado como `[]`)

## Criterios de aceptación

- [ ] Al abrir el modal de "Agregar horario", se muestran los tipos de turno disponibles del negocio
- [ ] Al abrir el modal de "Editar horario", los tipos de turno ya asociados a esa config aparecen marcados
- [ ] Al guardar, los tipos seleccionados quedan asociados a la configuración (esto ya funciona en el backend)
- [ ] Si el negocio no tiene tipos de turno creados, la sección no aparece en el modal (comportamiento ya implementado en el modal)

## Pruebas

- [ ] Modal de creación muestra todos los service types del negocio como opciones
- [ ] Modal de edición pre-marca los service types ya asociados a la config
- [ ] Guardar con tipos seleccionados persiste la asociación (verificar en DB o recargando la página)
- [ ] Si no hay service types, el modal funciona sin errores y sin mostrar esa sección
