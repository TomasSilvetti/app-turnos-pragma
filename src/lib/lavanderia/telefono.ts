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
// El emoji se escribe como code point (\u{1F44F} = 👏) en vez del carácter
// literal: así la fuente es ASCII puro y ningún paso del build/minificado puede
// corromper los bytes multibyte del emoji. encodeURIComponent lo codifica bien.
export const MENSAJE_PRENDAS_LISTAS =
  "Estimado cliente, las prendas que dejó en el local 5Asec Terrazul - Yerba Buena, están listas para ser retiradas.\u{1F44F}\n¡Lo esperamos!";

// ¿El dispositivo es un celular? Sólo tiene sentido en el cliente (navigator).
function esMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

// Arma el link de WhatsApp con el aviso de prendas listas. Devuelve null si el
// teléfono no es válido.
//
// En desktop apuntamos directo a web.whatsapp.com/send: evita el redirect de
// wa.me (que al re-encodear rompía el emoji dejando "�") y salta la página
// intermedia, abriendo el chat directo. En mobile usamos wa.me, que deep-linkea
// al app nativo (donde el texto se decodifica bien).
export function linkWhatsappPrendasListas(telefono: string | null | undefined): string | null {
  const numero = telefonoWhatsapp(telefono);
  if (!numero) return null;
  const text = encodeURIComponent(MENSAJE_PRENDAS_LISTAS);
  return esMobile()
    ? `https://wa.me/${numero}?text=${text}`
    : `https://web.whatsapp.com/send?phone=${numero}&text=${text}`;
}

// Referencia a la pestaña de WhatsApp que abrió la app. La guardamos para
// reutilizarla y no apilar una pestaña nueva en cada envío.
let waWin: Window | null = null;

// Abre WhatsApp reutilizando, si se puede, la misma pestaña que abrimos antes.
// Nota: el navegador NO permite tocar pestañas que abrió el usuario a mano (ni
// enumerarlas ni cerrarlas); sólo podemos reutilizar la que abrió la app. Si el
// navegador cortó el vínculo (WhatsApp Web usa COOP), cae a abrir una nueva.
export function abrirWhatsapp(url: string): void {
  if (typeof window === "undefined") return;
  try {
    if (waWin && !waWin.closed) {
      // Navegar una ventana por referencia sí está permitido cross-origin.
      waWin.location.href = url;
      waWin.focus();
      return;
    }
  } catch {
    // Referencia cortada por COOP: seguimos y abrimos una nueva.
  }
  waWin = window.open(url, "whatsapp");
}
