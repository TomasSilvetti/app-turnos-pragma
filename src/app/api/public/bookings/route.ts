import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getClientSession } from "@/lib/cliente-auth";
import { sendPushToServiceProvider } from "@/lib/push-notifications";
import { sendWhatsApp } from "@/lib/twilio";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido" }, { status: 400 });
  }

  const { clientName, clientSurname, clientPhone, appointmentId, serviceTypeId, paymentMethod } = body;

  if (!appointmentId) {
    return NextResponse.json({ error: "El campo appointmentId es requerido" }, { status: 400 });
  }

  // Intentar leer la sesión del cliente autenticado
  const clientSession = await getClientSession(request);

  // Determinar si es flujo autenticado o legacy
  const isAuthenticatedFlow = !!clientSession;
  const isLegacyFlow = !clientSession && clientName && clientSurname && clientPhone;

  if (!isAuthenticatedFlow && !isLegacyFlow) {
    return NextResponse.json(
      { error: "Se requiere autenticación o los campos clientName, clientSurname y clientPhone" },
      { status: 401 }
    );
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      isActive: true,
      serviceProviderId: true,
      booking: { select: { status: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  if (!appointment.isActive) {
    return NextResponse.json({ error: "El turno no está disponible" }, { status: 409 });
  }

  if (appointment.booking?.status === "confirmed" || appointment.booking?.status === "pending") {
    return NextResponse.json({ error: "El turno ya fue reservado" }, { status: 409 });
  }

  // Validar y resolver paymentMethod
  const businessForPayment = await prisma.businessProfile.findFirst({
    where: {
      OR: [
        { serviceProviderId: appointment.serviceProviderId },
        { empleados: { some: { serviceProviderId: appointment.serviceProviderId } } },
      ],
    },
    select: { cashEnabled: true, transferEnabled: true },
  });

  let resolvedPaymentMethod: string | null = null;
  if (businessForPayment) {
    const activeMethods: string[] = [];
    if (businessForPayment.cashEnabled) activeMethods.push("cash");
    if (businessForPayment.transferEnabled) activeMethods.push("transfer");

    if (activeMethods.length === 1) {
      // Solo un método activo: se asigna automáticamente
      resolvedPaymentMethod = activeMethods[0];
    } else if (activeMethods.length > 1) {
      // Más de un método activo: el cliente debe elegir
      if (!paymentMethod) {
        return NextResponse.json(
          { error: "Debe seleccionar un método de pago" },
          { status: 400 }
        );
      }
      if (!["cash", "transfer"].includes(paymentMethod)) {
        return NextResponse.json(
          { error: "Método de pago inválido" },
          { status: 400 }
        );
      }
      if (!activeMethods.includes(paymentMethod)) {
        return NextResponse.json(
          { error: "El método de pago seleccionado no está disponible" },
          { status: 400 }
        );
      }
      resolvedPaymentMethod = paymentMethod;
    }
  }

  if (serviceTypeId != null) {
    // Verificar que el tipo de turno pertenezca al mismo negocio del empleado
    const businessProfile = await prisma.businessProfile.findFirst({
      where: {
        OR: [
          { serviceProviderId: appointment.serviceProviderId },
          { empleados: { some: { serviceProviderId: appointment.serviceProviderId } } },
        ],
      },
      select: { id: true },
    });

    const serviceType = await prisma.serviceType.findFirst({
      where: { id: serviceTypeId, businessProfileId: businessProfile?.id },
    });

    if (!serviceType) {
      return NextResponse.json({ error: "serviceTypeId inválido o no pertenece al negocio" }, { status: 400 });
    }
  }

  // Preparar datos del booking según el flujo
  const bookingClientName = isAuthenticatedFlow
    ? `${clientSession.nombre} ${clientSession.apellido}`
    : `${clientName.trim()} ${clientSurname.trim()}`;

  let bookingClientPhone = isAuthenticatedFlow ? "" : clientPhone.trim();
  if (isAuthenticatedFlow) {
    const clienteData = await prisma.cliente.findUnique({
      where: { id: clientSession.clienteId },
      select: { telefono: true },
    });
    bookingClientPhone = clienteData?.telefono ?? "";
  }
  const bookingClienteId = isAuthenticatedFlow ? clientSession.clienteId : null;

  const booking = await prisma.booking.upsert({
    where: { appointmentId },
    update: {
      clientName: bookingClientName,
      clientPhone: bookingClientPhone,
      clienteId: bookingClienteId,
      status: "pending",
      paymentMethod: resolvedPaymentMethod,
    },
    create: {
      appointmentId,
      clientName: bookingClientName,
      clientPhone: bookingClientPhone,
      clienteId: bookingClienteId,
      status: "pending",
      paymentMethod: resolvedPaymentMethod,
    },
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      clienteId: true,
      status: true,
      paymentMethod: true,
    },
  });

  if (serviceTypeId != null) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { serviceTypeId },
    });
  }

  // Enviar notificación push al empleado asignado al turno (fire-and-forget)
  const appointmentFull = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { date: true, time: true, serviceProviderId: true },
  });

  if (appointmentFull) {
    sendPushToServiceProvider(appointmentFull.serviceProviderId, {
      title: "Nuevo turno",
      body: `${booking.clientName} el ${appointmentFull.date} a las ${appointmentFull.time}`,
    }).catch(() => {});

    // Enviar WhatsApp de confirmación al cliente (fire-and-forget)
    if (booking.clientPhone) {
      const businessProfile = await prisma.businessProfile.findFirst({
        where: {
          OR: [
            { serviceProviderId: appointmentFull.serviceProviderId },
            { empleados: { some: { serviceProviderId: appointmentFull.serviceProviderId } } },
          ],
        },
        select: { name: true },
      });

      const businessName = businessProfile?.name ?? "el negocio";
      const whatsappBody = `¡Tu turno está confirmado! 📅 ${appointmentFull.date} a las ${appointmentFull.time} en ${businessName}. ¡Te esperamos!`;

      sendWhatsApp({ to: booking.clientPhone, body: whatsappBody }).catch((err) => {
        console.error("[WhatsApp] Error al enviar confirmación de turno:", err);
      });
    }
  }

  return NextResponse.json(booking, { status: 201 });
}
