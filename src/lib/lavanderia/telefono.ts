// Normaliza un teléfono argentino al formato que necesita un link de wa.me:
// país (54) + 9 de celular + área + número, sin "+", espacios ni guiones.
// Los teléfonos se cargan libres desde el ticket (OCR), así que puede venir de
// muchas formas: "11 2233-4455", "+54 11 2233 4455", "+54 9 11 2233-4455", etc.
// Verificamos y agregamos lo que falte. Devuelve null si no parece un número
// válido (en ese caso no se ofrece el link de WhatsApp).
export function telefonoWhatsapp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;

  // Prefijo de discado internacional (00 54 ...).
  if (d.startsWith("00")) d = d.slice(2);
  // Código de país.
  if (d.startsWith("54")) d = d.slice(2);
  // 9 de celular: lo sacamos y lo volvemos a poner nosotros más abajo, así
  // normalizamos tanto los que lo traen como los que no.
  if (d.startsWith("9")) d = d.slice(1);
  // Prefijo nacional de larga distancia (0 delante del área).
  if (d.startsWith("0")) d = d.slice(1);

  // En Argentina el área + número siempre suma 10 dígitos. Si no da, no
  // arriesgamos un número mal armado.
  if (d.length !== 10) return null;

  return "549" + d;
}

// Mensaje que se le manda al cliente cuando su pedido está listo para retirar.
export const MENSAJE_PRENDAS_LISTAS =
  "Estimado cliente, las prendas que dejó en el local 5Asec Terrazul - Yerba Buena, están listas para ser retiradas.\n¡Lo esperamos!";

// Arma el link de wa.me con el aviso de prendas listas. Devuelve null si el
// teléfono no es válido.
export function linkWhatsappPrendasListas(telefono: string | null | undefined): string | null {
  const numero = telefonoWhatsapp(telefono);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(MENSAJE_PRENDAS_LISTAS)}` : null;
}
