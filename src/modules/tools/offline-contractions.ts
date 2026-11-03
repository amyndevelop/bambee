"use client";
const databaseName = "bambee-private-contractions-v1";
function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(databaseName, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("vault");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(new Error("No se pudo abrir el almacenamiento privado local"));
  });
}
async function access<T>(key: string, value?: unknown, write = false) {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("vault", write ? "readwrite" : "readonly"),
        store = tx.objectStore("vault"),
        r = write ? store.put(value, key) : store.get(key);
      let result: T;
      r.onsuccess = () => {
        result = r.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () =>
        reject(new Error("No se pudo guardar el registro local"));
    });
  } finally {
    db.close();
  }
}
async function encryptionKey(scope: string) {
  const keyName = "key:" + scope;
  let key = await access<CryptoKey | undefined>(keyName);
  if (!key) {
    key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    await access(keyName, key, true);
  }
  return key;
}
export async function readLocalContractions<T>(
  scope: string,
): Promise<T | null> {
  const row = await access<
    { iv: Uint8Array; bytes: ArrayBuffer; expiresAt: number } | undefined
  >("state:" + scope);
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    const db = await database();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("vault", "readwrite"),
          store = tx.objectStore("vault");
        store.delete("state:" + scope);
        store.delete("key:" + scope);
        tx.oncomplete = () => resolve();
        tx.onerror = () =>
          reject(new Error("No se pudo eliminar la copia local vencida"));
      });
    } finally {
      db.close();
    }
    return null;
  }
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: row.iv as Uint8Array<ArrayBuffer> },
      await encryptionKey(scope),
      row.bytes,
    );
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}
export async function writeLocalContractions(scope: string, value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12)),
    bytes = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await encryptionKey(scope),
      new TextEncoder().encode(JSON.stringify(value)),
    );
  await access(
    "state:" + scope,
    { iv, bytes, expiresAt: Date.now() + 48 * 3600000 },
    true,
  );
  await access("last-scope", scope, true);
}
export async function clearLocalContractions() {
  return new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase(databaseName);
    r.onsuccess = () => resolve();
    r.onerror = () =>
      reject(new Error("No se pudo limpiar el almacenamiento local"));
    r.onblocked = () =>
      reject(new Error("Cerrá otras pestañas de BAMBEE antes de salir"));
  });
}

/** Minimal routing context, recovered only from a non-expired encrypted timer copy. */
export async function latestOfflineContractionScope() {
  const db = await database();
  let keys: IDBValidKey[];
  try {
    keys = await new Promise((resolve, reject) => {
      const tx = db.transaction("vault", "readonly"),
        r = tx.objectStore("vault").getAllKeys();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(new Error("No se pudo recuperar el cronómetro"));
    });
  } finally {
    db.close();
  }
  const latest = await access<string | undefined>("last-scope");
  if (latest)
    keys = [
      "state:" + latest,
      ...keys.filter((key) => key !== "state:" + latest),
    ];
  for (const key of keys) {
    if (typeof key !== "string" || !key.startsWith("state:")) continue;
    const scope = key.slice(6),
      state = await readLocalContractions<{
        sessions: { status: string }[];
        queue: unknown[];
      }>(scope);
    if (
      state &&
      (state.queue.length || state.sessions.some((s) => s.status === "ACTIVE"))
    ) {
      const [userId, pregnancyId] = scope.split(":");
      if (userId && pregnancyId) return { userId, pregnancyId };
    }
  }
  return null;
}
