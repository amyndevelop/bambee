"use client";
import { useState } from "react";
import { Field, Empty } from "../ui";
import type { Row } from "@/lib/client";
import { useTool, ToolStatus, dateValue, dateTimeInput } from "./common";
export function Preparations({ pregnancyId }: { pregnancyId: string }) {
  const t = useTool("preparations", pregnancyId),
    [edit, setEdit] = useState<Row | null>(null),
    [open, setOpen] = useState(false),
    [filter, setFilter] = useState("all"),
    [category, setCategory] = useState("");
  const tasks: Row[] = t.data?.tasks || [],
    categories: Row[] = t.data?.categories || [],
    done = tasks.filter((x) => x.completed).length;
  const saveTask = async (r: Row, completed: boolean) => {
    const previous = t.data;
    t.setData((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((task: Row) =>
              task.id === r.id ? { ...task, completed } : task,
            ),
          }
        : current,
    );
    const result = await t.act("save", {
      ...r,
      completed,
      dueDate: r.dueDate ? dateValue(r.dueDate) : null,
    });
    if (!result) t.setData(previous);
  };
  const reorder = (id: string, offset: number) => {
    const ids = tasks.map((x) => x.id),
      i = ids.indexOf(id),
      j = i + offset;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void t.act("reorder", ids);
  };
  return (
    <>
      <ToolStatus {...t} />
      <section className="card tool-intro">
        <p className="eyebrow">A TU RITMO</p>
        <h2>Mis preparativos</h2>
        <p>
          Listas orientativas y editables. Adaptalas con tu equipo de salud y
          con la institución donde te atenderás.
        </p>
        <strong>
          {done} de {tasks.length} completados · {tasks.length - done}{" "}
          pendientes
        </strong>
        <progress
          max={100}
          value={tasks.length ? (done / tasks.length) * 100 : 0}
        />
        <p>
          {tasks.length ? Math.round((done / tasks.length) * 100) : 0}%
          preparado
        </p>
        <div className="tool-actions">
          {(t.data?.templates || []).map((v: Row) => (
            <button
              disabled={t.busy}
              key={v.id}
              onClick={() => void t.act("import", { templateId: v.id })}
            >
              Importar {v.title}
            </button>
          ))}
          <button
            className="primary"
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            Nueva tarea
          </button>
        </div>
      </section>
      <div className="tool-grid">
        <section className="card">
          <h3>Categorías</h3>
          <form
            className="tool-inline"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              if (
                await t.act("category", {
                  title: new FormData(form).get("title"),
                })
              )
                form.reset();
            }}
          >
            <Field
              name="title"
              label="Nueva categoría"
              required
              maxLength={100}
            />
            <button disabled={t.busy}>Agregar</button>
          </form>
          {categories.map((c) => (
            <div className="tool-row" key={c.id}>
              <span>{c.title}</span>
              <button
                aria-label={`Editar categoría ${c.title}`}
                onClick={() => {
                  const title = prompt("Nombre de la categoría", c.title);
                  if (title) void t.act("category", { id: c.id, title });
                }}
              >
                Editar
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "¿Eliminar la categoría? Sus tareas quedarán sin categoría.",
                    )
                  )
                    void t.act("deleteCategory", { id: c.id });
                }}
              >
                Eliminar
              </button>
            </div>
          ))}
        </section>
        <section className="card">
          <h3>Próximos pendientes</h3>
          {tasks
            .filter((x) => !x.completed && x.dueDate)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .slice(0, 5)
            .map((x) => (
              <p key={x.id}>
                {x.title} ·{" "}
                {new Date(x.dueDate).toLocaleDateString("es-AR", {
                  timeZone: "UTC",
                })}
              </p>
            ))}
          {!tasks.some((x) => !x.completed && x.dueDate) && (
            <p>No hay tareas pendientes con fecha límite.</p>
          )}
        </section>
      </div>
      {open && (
        <form
          className="card form-grid"
          key={edit?.id || "new"}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const result = await t.act("save", {
              id: edit?.id,
              title: f.get("title"),
              notes: f.get("notes"),
              categoryId: f.get("categoryId") || null,
              dueDate: f.get("dueDate") || null,
              assigneeId: f.get("assigneeId") || null,
              completed: edit?.completed || false,
              reminderAt: f.get("reminderAt")
                ? new Date(String(f.get("reminderAt"))).toISOString()
                : null,
            });
            if (result) setOpen(false);
          }}
        >
          <Field
            label="Tarea"
            name="title"
            defaultValue={edit?.title}
            required
            maxLength={300}
          />
          <label>
            Categoría
            <select name="categoryId" defaultValue={edit?.categoryId || ""}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Fecha límite"
            name="dueDate"
            type="date"
            defaultValue={dateValue(edit?.dueDate)}
          />
          <label>
            Responsable
            <select name="assigneeId" defaultValue={edit?.assigneeId || ""}>
              <option value="">Sin asignar</option>
              {(t.data?.people || []).map((p: Row) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Recordatorio (hora del dispositivo)"
            name="reminderAt"
            type="datetime-local"
            defaultValue={dateTimeInput(edit?.reminderAt)}
          />
          <label>
            Notas
            <textarea
              name="notes"
              maxLength={5000}
              defaultValue={edit?.notes}
            />
          </label>
          <button disabled={t.busy} className="primary">
            Guardar tarea
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Cancelar
          </button>
        </form>
      )}
      <div className="toolbar">
        <label>
          Estado
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="done">Completadas</option>
          </select>
        </label>
        <label>
          Categoría
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!tasks.length && !t.loading && (
        <Empty
          title="Un paso a la vez"
          text="Importá una lista inicial o agregá tus propios preparativos."
        />
      )}
      {tasks
        .filter(
          (x) =>
            (!category || x.categoryId === category) &&
            (filter === "all" || (filter === "done") === x.completed),
        )
        .map((x) => (
          <article className="card tool-task" key={x.id}>
            <label className="check">
              <input
                type="checkbox"
                checked={x.completed}
                disabled={t.busy}
                onChange={(e) => void saveTask(x, e.target.checked)}
              />
              <strong>{x.title}</strong>
            </label>
            <p>{x.notes}</p>
            <small>
              {categories.find((c) => c.id === x.categoryId)?.title ||
                "Sin categoría"}
              {x.dueDate
                ? ` · ${new Date(x.dueDate).toLocaleDateString("es-AR", { timeZone: "UTC" })}`
                : ""}
              {x.assigneeId
                ? ` · ${t.data?.people.find((p: Row) => p.id === x.assigneeId)?.name || "Responsable"}`
                : ""}
            </small>
            <div className="tool-actions">
              <button
                onClick={() => {
                  setEdit(x);
                  setOpen(true);
                }}
              >
                Editar
              </button>
              <button
                disabled={tasks[0]?.id === x.id || t.busy}
                aria-label={`Subir ${x.title}`}
                onClick={() => reorder(x.id, -1)}
              >
                ↑ Subir
              </button>
              <button
                disabled={tasks.at(-1)?.id === x.id || t.busy}
                aria-label={`Bajar ${x.title}`}
                onClick={() => reorder(x.id, 1)}
              >
                ↓ Bajar
              </button>
              <button
                onClick={() => {
                  if (confirm("¿Eliminar esta tarea?"))
                    void t.act("delete", { id: x.id });
                }}
              >
                Eliminar
              </button>
            </div>
          </article>
        ))}
    </>
  );
}
