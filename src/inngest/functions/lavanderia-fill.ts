import { inngest } from "@/lib/inngest";
import { recompactar } from "@/lib/lavanderia/capacidad";

// Corre cada minuto: reacomoda la cola de OTs llenando los huecos que se abren con
// el paso del tiempo (una OT que terminó, el día que avanzó, un turno que se acortó)
// sin que nadie tenga que tocar nada. Si no cambió nada, recompactar no escribe.
// El tablero (que hace polling de /version) ve el cambio en vivo, sin refrescar.
export const lavanderiaFill = inngest.createFunction(
  { id: "lavanderia-fill", triggers: [{ cron: "TZ=America/Argentina/Buenos_Aires * * * * *" }] },
  async ({ step }) => {
    const ops = await step.run("recompactar", () => recompactar());
    return { ops };
  }
);
