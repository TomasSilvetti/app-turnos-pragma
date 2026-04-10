# porcion-002 — Formulario de configuración de horarios + modal de advertencia — vista [FRONT]

**Historia de usuario:** HU-6: Configuración de horarios con generación lazy de turnos
**Par:** porcion-003
**Tipo:** FRONT
**Prerequisitos:** Ninguno
**Estado:** completada


## Descripción

Crear la página `/panel/configuracion-turnos` con el formulario para que el proveedor configure su disponibilidad semanal: horario de apertura/cierre, intervalo, días habilitados y tipos de turno. Incluye el modal de advertencia que aparece al intentar guardar cuando ya existe una configuración previa.

## Ejemplo de uso

El proveedor navega a "Configuración de turnos" en su panel. Ve los campos de horario, botones para seleccionar días (L a D, con L-V marcados por defecto), un selector de intervalo (15, 30, 45, 60 min) y una lista de sus tipos de turno para asociar. Al intentar guardar una config ya existente, aparece un modal que le advierte que los turnos generados serán reemplazados. Si hay reservas en conflicto, el modal muestra cuántas se verán afectadas.

## Criterios de aceptación

- [ ] La página existe en `/panel/configuracion-turnos` y es accesible solo para proveedores autenticados
- [ ] El formulario tiene campos para hora de apertura y cierre en formato 24hs
- [ ] El formulario tiene un selector de intervalo con opciones: 15, 30, 45 y 60 minutos
- [ ] Los días de la semana se muestran como botones toggle (L, M, X, J, V, S, D); L-V seleccionados por defecto
- [ ] Los tipos de turno disponibles se listan con checkboxes para selección múltiple
- [ ] El botón "Guardar" está deshabilitado si: hora de cierre ≤ apertura, ningún tipo de turno seleccionado, o ningún día seleccionado
- [ ] Los errores de validación se muestran inline por campo
- [ ] Si ya existe una configuración, el formulario se precarga con los valores actuales
- [ ] Al intentar guardar con config existente, aparece un modal con el mensaje: "Estás por actualizar tu configuración. Los turnos ya generados serán reemplazados por los nuevos parámetros. ¿Querés continuar?"
- [ ] Si hay reservas en conflicto, el modal muestra: "X reservas activas quedarán sin turno asignado con la nueva configuración. Podés continuar y gestionar las reprogramaciones después, o cancelar para revisar."
- [ ] El modal tiene botones "Cancelar" y "Continuar"
- [ ] Al guardar por primera vez (sin config previa), no aparece modal; se guarda directamente
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El botón "Guardar" se deshabilita cuando ningún día está seleccionado
- [ ] El botón "Guardar" se deshabilita cuando ningún tipo de turno está seleccionado
- [ ] El botón "Guardar" se deshabilita cuando la hora de cierre es igual o anterior a la de apertura
- [ ] Al hacer clic en un botón de día, alterna entre seleccionado y no seleccionado
- [ ] El modal se muestra al intentar guardar cuando `configExistente === true`
- [ ] El modal no se muestra al guardar cuando `configExistente === false`
- [ ] El texto del modal cambia cuando `conflictCount > 0`

### Pruebas de integración

- [ ] Al cargar la página con config existente, el formulario se precarga con los valores correctos y los tipos de turno correspondientes aparecen seleccionados
- [ ] Al cargar la página sin config previa, el formulario aparece vacío con L-V seleccionados por defecto
- [ ] Al hacer clic en "Continuar" en el modal, se dispara el llamado al endpoint de guardado
- [ ] Al hacer clic en "Cancelar" en el modal, se cierra el modal y no se realiza ningún llamado
