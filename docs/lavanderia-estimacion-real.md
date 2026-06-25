# Lavandería — Estimación real de demora (diseño)

> Estado: **diseño, sin implementar**. Documenta cómo pasar de la estimación
> serial actual (que sobreestima la cola) a una estimación basada en la
> capacidad real de las máquinas, agrupando tickets en tandas.

## 1. Diagnóstico del modelo actual

Hoy el sistema modela **un único recurso serial**:

- Cada prenda tiene procesos con minutos (`LavDuracion.minutos`).
- `OT.duracionMin` = suma de minutos de todos los procesos × cantidad.
- Cada día es un "presupuesto de minutos" (`capacidadDia` = suma de turnos).
- `asignarOT` mete OTs en el primer día con `ocupación + duración ≤ capacidad`
  (bin-packing 1D).

**Problema:** suma en serie minutos de trabajos que en la realidad corren en
**paralelo y en lote**. Lavar 8 tickets en un ciclo de lavadora ≠ lavar uno tras
otro. Por eso una cola "de 3 días" puede ser, en la realidad, de día y medio.

## 2. Insight clave: la secadora única es el cuello de botella

Dato del negocio: **hay una sola secadora**. Como casi todo lo lavado debe
secarse y la secadora procesa **una tanda por vez**, **ese recurso marca el
ritmo de toda la planta**. Consecuencias:

- Las lavadoras (varias, más rápidas) **alimentan** a la secadora y rara vez
  gobiernan la cola: total throughput ≈ throughput de la secadora.
- El planchado va **después** del secado y es **serial por persona**: puede ser
  un cuello de botella **secundario**, pero no adelanta a la secadora.
- **No hace falta un simulador completo para una primera estimación buena:**
  alcanza con modelar la secadora como el recurso serializador y contar tandas.

Esto define la estrategia: **modelo general de recursos**, pero con un
**estimador centrado en el cuello de botella** que hoy es la secadora (y que
sigue siendo correcto si mañana suman una segunda secadora o si el planchado
pasa a ser el límite).

## 3. Modelo conceptual

La planta es un **flow shop multi-etapa con recursos paralelos y procesamiento
por lotes**:

```
(manchas) → lavado → secado → planchado → entrega
   rama      batch     batch     serial
  opcional  N máq.    1 máq.   N personas
```

- **Etapas en secuencia con precedencia:** no se seca antes de lavar, no se
  plancha antes de secar.
- **Cada etapa tiene un pool de recursos** (N lavadoras, 1 secadora, N puestos
  de planchado).
- **Batch vs serial:**
  - *batch-máquina* (lavado, secado): entran varias prendas juntas hasta llenar
    la carga; el ciclo dura lo mismo lleno o medio lleno.
  - *serial-mano-de-obra* (planchado): una persona plancha de a una prenda; N
    personas en paralelo.
- **Unidad de carga: "cupos"** (decisión tomada). Cada prenda ocupa cupos según
  su tamaño: `1 remera = 1 cupo`, `1 frazada = 4 cupos`. Cada máquina tiene una
  capacidad en cupos por ciclo. Los cupos pueden **diferir por etapa** (una
  frazada puede ocupar 4 cupos al lavar y 5 al secar).
- **Compatibilidad de tanda:** las prendas se agrupan **dentro de su clase**
  (blancos / color / delicado / manchado). Se pueden **mezclar prendas de
  distintos tickets** en una misma tanda si son compatibles (decisión tomada) —
  esto es lo que habilita el ahorro de tiempo real. La compatibilidad puede ser
  **más laxa en secado** que en lavado (a confirmar).
- **Manchas:** rama previa que solo usan items marcados; no todos pasan por ahí.
- **Horario:** las máquinas corren solo en turnos abiertos (`turnosDelDia`); un
  ciclo que no cierra antes del fin de turno sigue al día siguiente.

## 4. Modelo de datos propuesto (Prisma)

```prisma
model LavRecurso {
  id               String   @id @default(cuid())
  nombre           String   // "Lavadora 1", "Secadora", "Plancha A"
  tipo             LavRecursoTipo
  procesoId        String   // a qué proceso/etapa sirve
  cantidad         Int      @default(1)   // nº de unidades de este recurso
  cargaMaxCupos    Int      // cupos por ciclo (batch) o 1 (serial)
  duracionCicloMin Int      // minutos por ciclo (batch) — en serial, ver prenda
  modo             LavRecursoModo @default(batch) // batch | serial
  proceso          LavProceso @relation(fields: [procesoId], references: [id])

  @@map("lav_recursos")
}

enum LavRecursoTipo { lavadora secadora manchas planchadora }
enum LavRecursoModo { batch serial }

// Extender la matriz prenda × proceso con cupos y clase de compatibilidad.
model LavDuracion {
  // ...existente: prendaId, procesoId, minutos...
  cupos       Int  @default(1)   // cuántos cupos ocupa la prenda en esa etapa
  // minutos: se reinterpreta como tiempo de mano de obra en etapas seriales
}

// En LavPrenda (o por item de OT, si varía por ticket):
//   claseCompat: "blanco" | "color" | "delicado"
//   requiereManchas: Boolean   // o decidido por ticket al cargar
```

Una OT deja de tener un `duracionMin` plano: se vuelve **un conjunto de
operaciones** (item × etapa) con cupos y precedencia. `duracionMin` se puede
conservar como dato informativo/legacy.

## 5. Algoritmo de estimación

> Agrupar + secuenciar con lotes y precedencia es **NP-duro**. **No** se busca el
> óptimo exacto. Se usa una **heurística greedy / simulación de eventos** que da
> tiempos realistas y **explicables**.

### 5a. Estimador centrado en el cuello de botella (recomendado para empezar)

Válido y preciso mientras la secadora sea el límite (hoy lo es).

1. Tomar el backlog ordenado por prioridad (FIFO por ingreso; atrasadas al
   frente, como ya hace `migrarAtrasadas`).
2. Para cada OT en orden, juntar sus items que **requieren secado** y agruparlos
   con los de otras OTs en **tandas por clase compatible** hasta `cargaMaxCupos`
   de la secadora.
3. La secadora procesa **una tanda por vez**: ir acumulando ciclos sobre el
   calendario de turnos.
   - `ciclos_por_día = minutos_de_turno_del_día / duracionCicloSecadora`
   - Cada tanda consume 1 ciclo; se "derrama" al día siguiente cuando se acaba el
     turno.
4. El **fin de una OT** = fin del último ciclo de secado de sus items
   `+ tiempo de planchado` (si aplica, sumado sobre los N puestos en paralelo)
   `+ buffer de armado/entrega`.
5. La **fecha prometida** = ese instante, redondeado a fin de jornada y con
   buffer de seguridad.

**Ejemplo (números de ejemplo — reemplazar por los reales):**
secadora = 20 cupos/ciclo, ciclo 60 min, jornada 600 min ⇒ 10 ciclos/día ⇒
200 cupos/día. Si hay 350 cupos de secado por delante, son 1,75 días: termina a
media mañana del 2.º día. Un ticket nuevo de 8 cupos entra en la tanda siguiente
y cierra poco después. → se le promete con fundamento.

### 5b. Simulación de eventos discretos (general — fase posterior)

Cuando haya más de un recurso que pueda ser cuello de botella (2.ª secadora,
planchado saturado), generalizar a una simulación:

- Estado por recurso: N "slots" con su próximo instante libre.
- Avance por etapas en orden topológico: juntar items listos (etapa previa
  terminada) → agruparlos en tandas por clase y carga → asignar a la próxima
  máquina libre → avanzar el reloj respetando turnos.
- Etapas seriales: cada prenda ocupa una persona su `minutos`; N en paralelo.
- Fin de item = fin de su última etapa; fin de OT = máx de sus items + buffer.

La 5a es un caso particular de la 5b con la secadora como único recurso
serializador.

## 6. Prometer la fecha al cliente

Correr el estimador sobre **backlog actual + ticket nuevo** y leer su instante
de fin. Sumar un **buffer de seguridad** (p. ej. +½ jornada) para no prometer al
límite. Ese es el "estará miércoles–jueves" con base real.

## 7. Impacto en el tablero

- **Vista compromiso (empleado/cliente):** cada OT cae en su **día de
  finalización** estimado → se ve cuándo se retira. Es lo que se busca.
- **Vista de planta (admin):** mostrar las **tandas por máquina y franja**
  (qué entra en cada lavadora/secadora/plancha). Hace visible el cuello de
  botella y guía al operario.

Recomendación: mantener ambas — empleado por día de entrega; admin con un "plan
de tandas".

## 8. Datos a relevar (checklist)

**Máquinas:**
- Lavadoras: cuántas, capacidad en cupos por ciclo, minutos por ciclo.
- Secadora: capacidad en cupos por ciclo, minutos por ciclo. (cantidad = 1)
- Lavadora de manchas: cuántas, capacidad, ciclo, y qué prendas/% la usan.
- Planchado: cuántas personas planchan en paralelo.

**Por prenda (extender la matriz):**
- Cupos que ocupa en lavado y en secado (pueden diferir).
- Clase de compatibilidad (blanco / color / delicado).
- Si requiere manchas (o se decide por ticket).
- Si requiere planchado y minutos de planchado por unidad.

**Planta:**
- Turnos/horario (ya cargado).
- ¿La secadora admite mezclar clases en una misma tanda? (compatibilidad en
  secado).
- Buffer de armado/entrega a sumar al final.

## 9. Plan por fases

1. **Cargar recursos y cupos** (modelo de datos + ABM de máquinas y matriz
   extendida). Sin cambiar aún la estimación.
2. **Estimador bottleneck (5a)**: reemplazar `asignarOT`/`getTablero` para
   estimar por tandas de secadora. Gran salto de precisión, cambio acotado.
3. **Vista de tandas** para el admin.
4. **Simulación general (5b)** cuando se justifique (2.ª secadora, etc.).

## 10. Decisiones abiertas

- ¿Compatibilidad de secado más laxa que la de lavado? (afecta cómo se arman las
  tandas de secadora).
- ¿Hay prendas que **no** pasan por la secadora (secado al aire) y por ende no
  cargan el cuello de botella?
- ¿El planchado llega a saturar en picos? (define si hay que modelarlo como
  segundo cuello de botella desde el inicio).
- ¿Los cupos se definen por prenda fija o pueden variar por ticket (carga real)?
