"use client";
import { api, type Row } from "@/lib/client";
import { Plus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Empty, Field } from "./ui";
export function Agenda({
  pregnancyId,
  save,
}: {
  pregnancyId: string;
  save: (d: Row) => Promise<void>;
}) {
  const [rows, setRows] = useState<Row[]>([]),
    [edit, setEdit] = useState<Row | null>(null),
    [open, setOpen] = useState(false),
    [month, setMonth] = useState(new Date().toISOString().slice(0, 7)),
    [view, setView] = useState("list"),
    [err, setErr] = useState("");
  const load = () =>
    api("/api/data?kind=appointment&pregnancyId=" + pregnancyId)
      .then(setRows)
      .catch((e) => setErr(e.message));
  useEffect(() => {
    void load();
  }, [pregnancyId]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const d = Object.fromEntries(new FormData(e.currentTarget));
      await save({
        ...d,
        action: "appointment",
        id: edit?.id,
        at: new Date(String(d.at)).toISOString(),
        reminder: Number(d.reminder),
      });
      setOpen(false);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function act(d: Row) {
    try {
      await save(d);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  return (
    <>
      <div className="toolbar">
        <div>
          <button
            className={view === "list" ? "selected" : ""}
            onClick={() => setView("list")}
          >
            Lista
          </button>
          <button
            className={view === "month" ? "selected" : ""}
            onClick={() => setView("month")}
          >
            Mes
          </button>
        </div>
        <button
          className="primary"
          onClick={() => {
            setEdit(null);
            setOpen(!open);
          }}
        >
          <Plus size={18} /> Agendar cita
        </button>
      </div>
      {err && <p className="error">{err}</p>}
      {open && (
        <form
          className="card form-grid"
          onSubmit={submit}
          key={edit?.id || "new"}
        >
          <Field
            label="Título"
            name="title"
            required
            defaultValue={edit?.title}
          />
          <label>
            Tipo
            <select name="type" defaultValue={edit?.type}>
              {[
                "Consulta obstétrica",
                "Ecografía",
                "Análisis de laboratorio",
                "Estudio prenatal",
                "Otro",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <Field
            label="Fecha y hora (zona horaria de este dispositivo)"
            name="at"
            type="datetime-local"
            required
            defaultValue={
              edit
                ? new Date(
                    new Date(edit.at).getTime() -
                      new Date(edit.at).getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
          />
          <Field
            label="Profesional"
            name="professional"
            defaultValue={edit?.professional}
          />
          <Field
            label="Centro médico"
            name="location"
            defaultValue={edit?.location}
          />
          <Field
            label="Dirección"
            name="address"
            defaultValue={edit?.address || ""}
          />
          <Field
            label="Recordar minutos antes (0 = sin recordatorio)"
            type="number"
            name="reminder"
            min={0}
            max={10080}
            defaultValue={1440}
          />
          <label>
            Notas
            <textarea name="notes" defaultValue={edit?.notes} />
          </label>
          <button className="primary">Guardar cita</button>
          <button type="button" onClick={() => setOpen(false)}>
            Cancelar
          </button>
        </form>
      )}
      {view === "month" && (
        <section className="card">
          <Field
            label="Mes"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <div className="calendar-grid">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <strong className="calendar-day" key={d}>
                {d}
              </strong>
            ))}
            {Array.from(
              { length: (new Date(month + "-01T12:00:00").getDay() + 6) % 7 },
              (_, i) => (
                <div className="calendar-blank" key={"blank" + i} />
              ),
            )}
            {Array.from(
              {
                length: new Date(
                  Number(month.slice(0, 4)),
                  Number(month.slice(5)),
                  0,
                ).getDate(),
              },
              (_, i) => i + 1,
            ).map((day) => (
              <div key={day}>
                <strong>{day}</strong>
                {rows
                  .filter(
                    (r) =>
                      new Date(r.at)
                        .toLocaleDateString("en-CA")
                        .startsWith(month) && new Date(r.at).getDate() === day,
                  )
                  .map((r) => (
                    <p key={r.id}>{r.title}</p>
                  ))}
              </div>
            ))}
          </div>
        </section>
      )}
      {!rows.length ? (
        <Empty
          title="Hagamos lugar para cuidarte"
          text="Agendá tu próxima consulta y configurá un recordatorio interno."
        />
      ) : (
        rows.map((r) => (
          <article className="card appointment" key={r.id}>
            <div className="date-badge">
              {new Date(r.at).getDate()}
              <small>
                {new Date(r.at).toLocaleDateString("es-AR", { month: "short" })}
              </small>
            </div>
            <div>
              <p className="eyebrow">
                {r.type} {r.completed ? "· REALIZADA" : ""}
              </p>
              <h3>{r.title}</h3>
              <p>
                {new Date(r.at).toLocaleString("es-AR")} · {r.professional} ·{" "}
                {r.location}
              </p>
              <p>{r.notes}</p>
            </div>
            <div className="entry-actions">
              <button
                onClick={() => {
                  setEdit(r);
                  setOpen(true);
                }}
              >
                Editar
              </button>
              <button
                onClick={() =>
                  act({ action: "complete", id: r.id, completed: !r.completed })
                }
              >
                {r.completed ? "Marcar pendiente" : "Marcar realizada"}
              </button>
              <button
                onClick={() => {
                  if (confirm("¿Eliminar la cita?"))
                    void act({ action: "deleteAppointment", id: r.id });
                }}
              >
                Eliminar
              </button>
            </div>
          </article>
        ))
      )}
    </>
  );
}
