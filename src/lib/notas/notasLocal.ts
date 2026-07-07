"use client";

// Espejo local (IndexedDB) de notas y eventos del calendario, para poder abrir,
// ver y editar sin conexión. Se llena cuando hay red y se lee cuando no la hay.

import { abrirDB, STORE_NOTES, STORE_EVENTS } from "./offline";

export type NotaLocal = {
  id: string;
  title: string;
  content: object;
  updatedAt: string;
};

export type EventoLocal = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  color: string;
  reminderOffsets: number[];
};

async function put(store: string, value: unknown): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function del(store: string, id: string): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function get<T>(store: string, id: string): Promise<T | null> {
  const db = await abrirDB();
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function getAll<T>(store: string): Promise<T[]> {
  const db = await abrirDB();
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => resolve([]);
  });
}

// ─── Notas ───
export const guardarNotaLocal = (n: NotaLocal) => put(STORE_NOTES, n).catch(() => {});
export const obtenerNotaLocal = (id: string) => get<NotaLocal>(STORE_NOTES, id);
export const eliminarNotaLocal = (id: string) => del(STORE_NOTES, id).catch(() => {});

// Actualiza sólo algunos campos de una nota local (title/content), preservando el resto.
export async function parchearNotaLocal(id: string, patch: Partial<NotaLocal>): Promise<void> {
  const actual = (await obtenerNotaLocal(id)) ?? { id, title: "", content: { type: "doc", content: [{ type: "paragraph" }] }, updatedAt: new Date().toISOString() };
  await guardarNotaLocal({ ...actual, ...patch, id });
}

export async function listarNotasLocal(): Promise<{ id: string; title: string; updatedAt: string }[]> {
  const notas = await getAll<NotaLocal>(STORE_NOTES);
  return notas
    .map((n) => ({ id: n.id, title: n.title, updatedAt: n.updatedAt }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

// ─── Eventos de calendario ───
export const guardarEventoLocal = (e: EventoLocal) => put(STORE_EVENTS, e).catch(() => {});
export const eliminarEventoLocal = (id: string) => del(STORE_EVENTS, id).catch(() => {});

export async function guardarEventosLocal(eventos: EventoLocal[]): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_EVENTS, "readwrite");
    const store = tx.objectStore(STORE_EVENTS);
    for (const e of eventos) store.put(e);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listarEventosLocalRango(from: string, to: string): Promise<EventoLocal[]> {
  const eventos = await getAll<EventoLocal>(STORE_EVENTS);
  return eventos.filter((e) => e.date >= from && e.date <= to);
}
