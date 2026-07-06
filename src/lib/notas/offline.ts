"use client";

// Cola de mutaciones (outbox) para trabajar sin conexión. Cuando un POST/PUT/DELETE
// falla por falta de red, se guarda acá y se reintenta al recuperar la conexión.
// Los ids de los recursos se generan en el cliente, así que las creaciones offline
// conservan su id al sincronizarse (el servidor acepta `id` en el body).

const DB_NAME = "notas-offline";
const STORE = "outbox";
const DB_VERSION = 1;

export type OutboxItem = {
  id?: number;
  method: string;
  url: string;
  body?: string;
  deviceId: string | null;
  ts: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function abrirDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function encolar(item: Omit<OutboxItem, "id">): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  window.dispatchEvent(new CustomEvent("notas:outbox-changed"));
}

async function listar(): Promise<OutboxItem[]> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as OutboxItem[]).sort((a, b) => a.ts - b.ts));
    req.onerror = () => reject(req.error);
  });
}

async function borrar(id: number): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function pendientes(): Promise<number> {
  try {
    return (await listar()).length;
  } catch {
    return 0;
  }
}

let sincronizando = false;

// Reintenta la cola en orden. Se detiene ante el primer fallo de red (sigue offline).
export async function sincronizar(): Promise<{ enviados: number; restantes: number }> {
  if (sincronizando) return { enviados: 0, restantes: await pendientes() };
  sincronizando = true;
  let enviados = 0;
  try {
    const items = await listar();
    for (const item of items) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (item.deviceId) headers["x-device-id"] = item.deviceId;
        const res = await fetch(item.url, { method: item.method, headers, body: item.body });
        // 2xx o 404 (recurso ya inexistente): damos por resuelto y sacamos de la cola.
        if (res.ok || res.status === 404) {
          if (item.id != null) await borrar(item.id);
          enviados++;
        } else {
          // Error del servidor (400/500): lo descartamos para no bloquear la cola.
          if (item.id != null) await borrar(item.id);
        }
      } catch {
        // Falla de red: seguimos offline, cortar y reintentar más tarde.
        break;
      }
    }
  } finally {
    sincronizando = false;
  }
  const restantes = await pendientes();
  window.dispatchEvent(new CustomEvent("notas:outbox-changed"));
  return { enviados, restantes };
}
