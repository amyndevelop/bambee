"use client";
import { api, type Row } from "@/lib/client";
import { useEffect, useState } from "react";
import { Empty } from "./ui";
export function Notifications({ save }: { save: (d: Row) => Promise<void> }) {
  const [rows, setRows] = useState<Row[]>([]);
  const load = () => api("/api/data?kind=notifications").then(setRows);
  useEffect(() => {
    void load();
  }, []);
  return rows.length ? (
    <div>
      {rows.map((r) => (
        <article className="card toolbar" key={r.id}>
          <div>
            <h3>{r.title}</h3>
            <p>{new Date(r.createdAt).toLocaleString("es-AR")}</p>
          </div>
          {!r.read && (
            <button
              onClick={async () => {
                await save({ action: "read", id: r.id });
                await load();
              }}
            >
              Marcar como leída
            </button>
          )}
        </article>
      ))}
    </div>
  ) : (
    <Empty
      title="Todo tranquilo por acá"
      text="Tus recordatorios y mensajes aparecerán en este espacio."
    />
  );
}
