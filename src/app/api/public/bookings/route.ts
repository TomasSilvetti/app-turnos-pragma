import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/cliente-auth";
import { sendPushToServiceProvider, sendEmailToServiceProvider } from "@/lib/push-notifications";
import { emitNewBooking } from "@/lib/booking-emitter";
import { BookingStatus } from "@prisma/client";


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
      date: true,
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

  const businessForPayment = await prisma.businessProfile.findFirst({
    where: {
      OR: [
        { serviceProviderId: appointment.serviceProviderId },
        { empleados: { some: { serviceProviderId: appointment.serviceProviderId } } },
      ],
    },
    select: { cashEnabled: true, transferEnabled: true, serviceProviderId: true, empleados: { select: { serviceProviderId: true } } },
  });

  const businessServiceProviderIds = businessForPayment
    ? [businessForPayment.serviceProviderId, ...businessForPayment.empleados.map((e) => e.serviceProviderId)]
    : [appointment.serviceProviderId];

  const duplicateDayWhere = isAuthenticatedFlow
    ? { clienteId: clientSession.clienteId, status: { in: ["pending", "confirmed"] as BookingStatus[] }, appointment: { date: appointment.date, serviceProviderId: { in: businessServiceProviderIds } } }
    : { clientPhone: clientPhone.trim(), status: { in: ["pending", "confirmed"] as BookingStatus[] }, appointment: { date: appointment.date, serviceProviderId: { in: businessServiceProviderIds } } };

  const existingOnDate = await prisma.booking.findFirst({ where: duplicateDayWhere });
  if (existingOnDate) {
    return NextResponse.json({ error: "Ya tenés un turno reservado para ese día" }, { status: 409 });
  }

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
    const notifPayload = {
      title: "Nuevo turno reservado",
      body: `${booking.clientName} el ${appointmentFull.date.split("-").reverse().join("/")} a las ${appointmentFull.time}`,
    };
    sendPushToServiceProvider(appointmentFull.serviceProviderId, notifPayload).catch((err) =>
      console.error("[Push] Error enviando notificación:", err)
    );
    sendEmailToServiceProvider(appointmentFull.serviceProviderId, notifPayload).catch((err) =>
      console.error("[Email] Error enviando notificación:", err)
    );
  }

  emitNewBooking();

  return NextResponse.json(booking, { status: 201 });
}
