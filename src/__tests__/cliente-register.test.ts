import { NextRequest } from "next/server";
import { POST } from "@/app/api/clientes/register/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    cliente: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
}));

jest.mock("@/lib/cliente-auth", () => ({
  setClientSession: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";

const mockFindUnique = prisma.cliente.findUnique as jest.Mock;
const mockCreate = prisma.cliente.create as jest.Mock;

const validBody = {
  nombre: "María",
  apellido: "García",
  email: "maria@test.com",
  telefono: "+5491112345678",
  sexo: "F",
  edad: 30,
  password: "Secure@123",
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/clientes/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/clientes/register", () => {
  beforeEach(() => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "c-1",
      nombre: "María",
      apellido: "García",
      email: "maria@test.com",
    });
  });

  it("registra un cliente con datos válidos", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.email).toBe("maria@test.com");
  });

  it("rechaza si falta el nombre", async () => {
    const res = await POST(makeRequest({ ...validBody, nombre: "" }));
    expect(res.status).toBe(400);
  });

  it("rechaza si falta el apellido", async () => {
    const res = await POST(makeRequest({ ...validBody, apellido: "" }));
    expect(res.status).toBe(400);
  });

  it("rechaza si falta el email", async () => {
    const res = await POST(makeRequest({ ...validBody, email: "" }));
    expect(res.status).toBe(400);
  });

  it("rechaza si falta el teléfono", async () => {
    const res = await POST(makeRequest({ ...validBody, telefono: "" }));
    expect(res.status).toBe(400);
  });

  it("rechaza teléfono sin prefijo internacional", async () => {
    const res = await POST(makeRequest({ ...validBody, telefono: "1112345678" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/prefijo internacional/);
  });

  it("rechaza email con formato inválido", async () => {
    const res = await POST(makeRequest({ ...validBody, email: "no-es-email" }));
    expect(res.status).toBe(400);
  });

  it("rechaza contraseña menor a 8 caracteres", async () => {
    const res = await POST(makeRequest({ ...validBody, password: "Ab@1" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/8 caracteres/);
  });

  it("rechaza contraseña sin mayúscula ni carácter especial", async () => {
    const res = await POST(makeRequest({ ...validBody, password: "sinmayuscula123" }));
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toMatch(/mayúscula/);
  });

  it("rechaza edad fuera de rango", async () => {
    const res = await POST(makeRequest({ ...validBody, edad: 200 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/edad/i);
  });

  it("rechaza edad 0", async () => {
    const res = await POST(makeRequest({ ...validBody, edad: 0 }));
    expect(res.status).toBe(400);
  });

  it("rechaza si el email ya está registrado", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/Ya existe/);
  });

  it("normaliza el email a minúsculas", async () => {
    await POST(makeRequest({ ...validBody, email: "MARIA@TEST.COM" }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "maria@test.com" }) })
    );
  });

  it("rechaza body inválido (no JSON)", async () => {
    const req = new NextRequest("http://localhost/api/clientes/register", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
