import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { procesarVacante } from "@/inngest/functions/lista-espera";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [procesarVacante],
});
