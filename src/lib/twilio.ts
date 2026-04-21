import twilio from "twilio";

function getClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid) throw new Error("TWILIO_ACCOUNT_SID no está definido");
  if (!authToken) throw new Error("TWILIO_AUTH_TOKEN no está definido");

  return twilio(accountSid, authToken);
}

function normalizeWhatsAppNumber(phone: string): string {
  const stripped = phone.trim().replace(/\s+/g, "");
  if (!stripped.startsWith("+")) {
    throw new Error(`El número de teléfono debe incluir el prefijo internacional (+): ${stripped}`);
  }
  return `whatsapp:${stripped}`;
}

export async function sendWhatsApp({ to, body }: { to: string; body: string }): Promise<string> {
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!from) throw new Error("TWILIO_WHATSAPP_NUMBER no está definido");

  const client = getClient();
  const message = await client.messages.create({
    from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    to: normalizeWhatsAppNumber(to),
    body,
  });

  return message.sid;
}

export async function sendWhatsAppTemplate({
  to,
  contentSid,
  contentVariables,
}: {
  to: string;
  contentSid: string;
  contentVariables: Record<string, string>;
}): Promise<string> {
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!from) throw new Error("TWILIO_WHATSAPP_NUMBER no está definido");

  const client = getClient();
  const message = await client.messages.create({
    from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    to: normalizeWhatsAppNumber(to),
    contentSid,
    contentVariables: JSON.stringify(contentVariables),
  });

  return message.sid;
}
