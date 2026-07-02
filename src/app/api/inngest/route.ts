import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { procesarVacante } from "@/inngest/functions/lista-espera";
import { recordatorioDiaAnterior, recordatorio3HsAntes } from "@/inngest/functions/recordatorios";
import { notasRecordatorios } from "@/inngest/functions/notas-recordatorios";
import { lavanderiaFill } from "@/inngest/functions/lavanderia-fill";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [procesarVacante, recordatorioDiaAnterior, recordatorio3HsAntes, notasRecordatorios, lavanderiaFill],
});
