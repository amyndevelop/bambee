export type Row = Record<string, any>;
export async function api(path: string, body?: unknown, method = "POST") {
  const r = await fetch(
    path,
    body
      ? {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "No se pudo completar la operación");
  return d;
}
