---
# porcion-002 — Formulario de configuración de turnos — vista [FRONT]

**Historia de usuario:** HU-3: Configuración de turnos del prestador
**Par:** porcion-003
**Tipo:** FRONT
**Prerequisitos:** Ninguno
**Estado:** 🔄 En progreso

## Descripción

Crear el formulario en el panel de administración donde el prestador ingresa hora de inicio, hora de fin, intervalo en minutos y precio por turno, con validación visual en tiempo real y botón de guardado.

## Ejemplo de uso

El prestador entra al panel, ve un formulario con cuatro campos. Si intenta dejar "hora de fin" vacía o ingresa un precio de $0, aparece un mensaje de error debajo del campo correspondiente. Una vez que todos los campos son válidos, el botón "Guardar configuración" se habilita.

## Criterios de aceptación

- [ ] El formulario muestra los campos: hora de inicio (time picker), hora de fin (time picker), intervalo en minutos (número), precio por turno (número decimal)
- [ ] El botón "Guardar configuración" está deshabilitado si algún campo obligatorio está vacío
- [ ] Si hora de fin es menor o igual a hora de inicio, se muestra un error: "La hora de fin debe ser posterior a la hora de inicio"
- [ ] Si el precio es menor o igual a 0, se muestra un error: "El precio debe ser mayor a cero"
- [ ] Si el intervalo no es un número entero positivo, se muestra un error: "El intervalo debe ser un número entero positivo"
- [ ] Los mensajes de error indican exactamente qué campo es inválido y por qué
- [ ] Si ya existe una configuración guardada, el formulario se pre-carga con los valores actuales
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El botón "Guardar" se deshabilita cuando hora de inicio está vacía
- [ ] El botón "Guardar" se deshabilita cuando precio está vacío
- [ ] Se muestra el mensaje de error correcto cuando hora de fin ≤ hora de inicio
- [ ] Se muestra el mensaje de error correcto cuando precio es 0 o negativo
- [ ] Se muestra el mensaje de error correcto cuando intervalo es 0, negativo o no entero
- [ ] El formulario se pre-carga con los valores recibidos via props cuando `initialValues` está definido

### Pruebas de integración

- [ ] Al hacer clic en "Guardar configuración" con todos los campos válidos, se llama al handler `onSubmit` con los valores correctos
- [ ] Si el componente recibe un estado de error externo (ej: error del servidor), lo muestra debajo del formulario
