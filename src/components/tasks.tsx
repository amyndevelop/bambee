"use client";
import { useState, useEffect, type FormEvent } from "react";
import { api, type Row } from "@/lib/client";
import { Field } from "./ui";
export function Tasks({
  pregnancyId,
  save,
}: {
  pregnancyId: string;
  save: (d: Row) => Promise<void>;
}) {
  const [rows, setRows] = useState<Row[]>([]),
    [allowed, setAllowed] = useState(false),
    [error, setError] = useState(""),
    [edit, setEdit] = useState<Row | null>(null);
  async function load() {
    try {
      setRows(await api("/api/data?kind=task&pregnancyId=" + pregnancyId));
      setAllowed(true);
    } catch {
      setAllowed(false);
    }
  }
  useEffect(() => {
    void load();
  }, [pregnancyId]);
  async function act(d: Row) {
    try {
      await save(d);
      setEdit(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!allowed) return null;
  return (
    <section className="card">
      <h2>Pequeñas tareas, en equipo</h2>
      <p>
        Las tareas se comparten únicamente con las personas autorizadas por la
        titular.
      </p>
      <form
        className="form-grid"
        key={edit?.id || "new"}
        onSubmit={(e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.currentTarget));
          void act({
            ...d,
            action: "task",
            id: edit?.id,
            completed: edit?.completed || false,
            dueDate: d.dueDate || null,
          });
        }}
      >
        <Field
          label="Tarea"
          name="title"
          required
          maxLength={150}
          defaultValue={edit?.title}
        />
        <Field
          label="Fecha opcional"
          name="dueDate"
          type="date"
          defaultValue={edit?.dueDate?.slice(0, 10) || ""}
        />
        <button className="primary">
          {edit ? "Guardar cambios" : "Agregar tarea"}
        </button>
        {edit && (
          <button type="button" onClick={() => setEdit(null)}>
            Cancelar
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {rows.map((t) => (
        <div className="toolbar" key={t.id}>
          <label className="check">
            <input
              type="checkbox"
              checked={t.completed}
              onChange={(e) =>
                void act({
                  action: "task",
                  id: t.id,
                  title: t.title,
                  completed: e.target.checked,
                  dueDate: t.dueDate?.slice(0, 10) || null,
                })
              }
            />
            {t.title}
            {t.dueDate ? " · " + t.dueDate.slice(0, 10) : ""}
          </label>
          <div>
            <button onClick={() => setEdit(t)}>Editar</button>
            <button
              onClick={() => {
                if (confirm("¿Eliminar esta tarea?"))
                  void act({ action: "deleteTask", id: t.id });
              }}
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
