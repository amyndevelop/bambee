"use client";
import { useState } from "react";
import { Field, Empty } from "../ui";
import type { Row } from "@/lib/client";
import { questionCategories } from "@/modules/tools/validation";
import { useTool, ToolStatus } from "./common";
export function Questions({
  pregnancyId,
  userId,
  appointmentId,
  compact = false,
}: {
  pregnancyId: string;
  userId: string;
  appointmentId?: string;
  compact?: boolean;
}) {
  const t = useTool("questions", pregnancyId),
    [edit, setEdit] = useState<Row | null>(null),
    [open, setOpen] = useState(false),
    [pending, setPending] = useState(false),
    [consult, setConsult] = useState(false);
  const appointments: Row[] = t.data?.appointments || [],
    questions: Row[] = (t.data?.questions || []).filter(
      (q: Row) => !appointmentId || q.appointmentId === appointmentId,
    ),
    next = appointments.find(
      (a) => !a.completed && new Date(a.at) >= new Date(),
    );
  return (
    <div className="questions-module">
      <ToolStatus {...t} />
      <div className="toolbar">
        <h2>{compact ? "Preguntas de esta cita" : "Mis preguntas"}</h2>
        <button
          className="primary"
          onClick={() => {
            setEdit(null);
            setOpen(true);
          }}
        >
          Nueva pregunta
        </button>
        {!compact && (
          <button onClick={() => setConsult(!consult)}>
            Preparar mi próxima consulta
          </button>
        )}
      </div>
      {consult && (
        <section className="card consultation-print">
          <h2>Mi próxima consulta</h2>
          {next ? (
            <>
              <h3>{next.title}</h3>
              <p>
                {new Date(next.at).toLocaleString("es-AR")} ·{" "}
                {next.professional}
              </p>
              <p className="preserve">{next.notes}</p>
              {questions
                .filter(
                  (q) =>
                    !q.answered &&
                    (!q.appointmentId || q.appointmentId === next.id),
                )
                .map((q) => (
                  <p key={q.id}>□ {q.question}</p>
                ))}
              <button className="no-print" onClick={() => window.print()}>
                Imprimir o guardar PDF
              </button>
            </>
          ) : (
            <p>No tenés una próxima consulta agendada.</p>
          )}
        </section>
      )}
      {open && (
        <form
          className="card form-grid"
          key={edit?.id || "new"}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              await t.act("save", {
                id: edit?.id,
                question: f.get("question"),
                category: f.get("category"),
                answer: f.get("answer"),
                answered: f.get("answered") === "on",
                shared: f.get("shared") === "on",
                reminder: f.get("reminder") === "on",
                appointmentId: f.get("appointmentId") || null,
              })
            )
              setOpen(false);
          }}
        >
          <Field
            label="Tu pregunta"
            name="question"
            defaultValue={edit?.question}
            required
            maxLength={300}
          />
          <label>
            Categoría
            <select name="category" defaultValue={edit?.category || "Otros"}>
              {questionCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Consulta asociada
            <select
              name="appointmentId"
              defaultValue={edit?.appointmentId || appointmentId || ""}
            >
              <option value="">Sin asociar</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} · {new Date(a.at).toLocaleDateString("es-AR")}
                </option>
              ))}
            </select>
          </label>
          <label>
            Respuesta del profesional
            <textarea
              name="answer"
              maxLength={5000}
              defaultValue={edit?.answer}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              name="answered"
              defaultChecked={edit?.answered}
            />
            Respondida
          </label>
          <label className="check">
            <input
              type="checkbox"
              name="shared"
              defaultChecked={edit?.shared}
            />
            Compartir esta pregunta con la pareja autorizada
          </label>
          <label className="check">
            <input
              type="checkbox"
              name="reminder"
              defaultChecked={edit?.reminder}
            />
            Recordatorio interno antes de la cita
          </label>
          <button className="primary" disabled={t.busy}>
            Guardar pregunta
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Cancelar
          </button>
        </form>
      )}
      <label className="check no-print">
        <input
          type="checkbox"
          checked={pending}
          onChange={(e) => setPending(e.target.checked)}
        />
        Solo pendientes
      </label>
      {!questions.length && !t.loading && (
        <Empty
          title="Tus dudas tienen su lugar"
          text="Guardá lo que quieras conversar con tu equipo de salud. No generamos respuestas médicas automáticas."
        />
      )}
      {questions
        .filter((q) => !pending || !q.answered)
        .map((q) => (
          <article className="card" key={q.id}>
            <small>
              {q.category} · {q.answered ? "Respondida" : "Pendiente"}
              {q.shared ? " · Compartida" : " · Privada"}
            </small>
            <h3>{q.question}</h3>
            {q.answer && <p className="preserve">{q.answer}</p>}
            {q.userId === userId && (
              <div className="tool-actions no-print">
                <button
                  onClick={() => {
                    setEdit(q);
                    setOpen(true);
                  }}
                >
                  Editar / registrar respuesta
                </button>
                <button
                  disabled={t.busy}
                  onClick={() =>
                    void t.act("save", { ...q, answered: !q.answered })
                  }
                >
                  {q.answered ? "Marcar pendiente" : "Marcar respondida"}
                </button>
                <button
                  onClick={() => {
                    if (confirm("¿Eliminar esta pregunta?"))
                      void t.act("delete", { id: q.id });
                  }}
                >
                  Eliminar
                </button>
              </div>
            )}
          </article>
        ))}
    </div>
  );
}
