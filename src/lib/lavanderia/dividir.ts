import type { ItemCalculado } from "./duraciones";

// Item de una parte: misma forma que un LavOTItem, con la cantidad recortada a la
// porcion que cae en esa parte.
export type ItemParte = {
  prendaId: string | null;
  descripcion: string;
  cantidad: number;
  procesoIds: string[];
  duracionMin: number;
};

export type Parte = {
  items: ItemParte[];
  duracionMin: number;
};

// Minutos de una unidad de un item (la matriz aplica por unidad; cantidad las
// multiplica). Si el item no tiene tiempos, la unidad vale 0.
function minutosUnidad(item: ItemCalculado): number {
  const cant = Math.max(1, item.cantidad);
  return Math.round(item.duracionMin / cant);
}

function nuevoItem(item: ItemCalculado, cantidad: number, minUnidad: number): ItemParte {
  return {
    prendaId: item.prendaId,
    descripcion: item.descripcion,
    cantidad,
    procesoIds: item.procesoIds,
    duracionMin: minUnidad * cantidad,
  };
}

// Reparte los items de una OT en partes de a lo sumo `limiteMin` minutos, moviendo
// unidades enteras (no se puede partir una unidad). Greedy first-fit: se llena la
// parte actual hasta que la proxima unidad no entra, y ahi se abre otra.
//
// Casos borde:
//  - Una unidad indivisible que sola supera el limite: va sola en su parte (excede
//    el limite, es inevitable).
//  - Items sin tiempos (duracion 0): no ocupan capacidad; se acumulan en la parte
//    actual sin abrir partes nuevas.
//
// Devuelve al menos una parte. Si todo entra en el limite, devuelve una sola.
export function dividirEnPartes(items: ItemCalculado[], limiteMin: number): Parte[] {
  const partes: Parte[] = [];
  let actual: Parte = { items: [], duracionMin: 0 };
  partes.push(actual);

  const abrirParte = () => {
    actual = { items: [], duracionMin: 0 };
    partes.push(actual);
  };
  const push = (item: ItemCalculado, cant: number, minUnidad: number) => {
    actual.items.push(nuevoItem(item, cant, minUnidad));
    actual.duracionMin += minUnidad * cant;
  };

  for (const item of items) {
    const minUnidad = minutosUnidad(item);
    let restante = Math.max(1, item.cantidad);

    // Sin tiempos: no consume capacidad, va todo en la parte actual.
    if (minUnidad <= 0) {
      push(item, restante, 0);
      continue;
    }

    while (restante > 0) {
      const espacio = limiteMin - actual.duracionMin;
      const cabenPorEspacio = Math.floor(espacio / minUnidad);

      if (cabenPorEspacio <= 0) {
        // No entra ni una unidad mas en la parte actual.
        if (actual.items.length === 0) {
          // Parte vacia y una sola unidad ya excede el limite: va sola igual.
          push(item, 1, minUnidad);
          restante -= 1;
        }
        if (restante > 0) abrirParte();
        continue;
      }

      const tomar = Math.min(cabenPorEspacio, restante);
      push(item, tomar, minUnidad);
      restante -= tomar;
      if (restante > 0) abrirParte();
    }
  }

  return partes;
}
