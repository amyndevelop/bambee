"use client";
import { api, type Row } from "@/lib/client";
import { BookOpen, Plus, Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Empty, Field } from "./ui";
export function Entries({
  kind,
  pregnancyId,
  save,
}: {
  kind: string;
  pregnancyId: string;
  save: (d: Row) => Promise<void>;
}) {
  const [appointments, setAppointments] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]),
    [edit, setEdit] = useState<Row | null>(null),
    [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false),
    [compare, setCompare] = useState<string[]>([]),
    [slide, setSlide] = useState(0);
  const media = ["belly", "ultrasound"].includes(kind);
  const load = () =>
    api(`/api/data?kind=${kind}&pregnancyId=${pregnancyId}`)
      .then(setRows)
      .catch((e) => setErr(e.message));
  useEffect(() => {
    setOpen(false);
    setEdit(null);
    void load();
    if (kind === "ultrasound")
      api("/api/data?kind=appointment&pregnancyId=" + pregnancyId)
        .then((a: Row[]) => setAppointments(a.filter((a) => a.completed)))
        .catch(() => {});
  }, [kind, pregnancyId]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const form = new FormData(e.currentTarget),
        d = Object.fromEntries(form);
      let fileId = edit?.fileId;
      let fileIds: string[] = (edit?.attachments || []).map(
        (a: Row) => a.fileId,
      );
      const chosen = (form.getAll("file") as File[]).filter((f) => f.size);
      if (chosen.length > 5)
        throw new Error("Podés cargar hasta 5 imágenes por entrada");
      if (chosen.length) {
        const ids: string[] = [];
        for (const file of chosen) {
          const upload = new FormData();
          upload.set("file", file);
          upload.set("kind", kind);
          const response = await fetch("/api/files", {
            method: "POST",
            body: upload,
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          ids.push(result.id);
        }
        fileId = ids[0];
        fileIds = ids.slice(1);
      }
      await save({
        ...d,
        appointmentId: d.appointmentId || null,
        action: "entry",
        kind,
        id: edit?.id,
        fileId,
        fileIds,
      });
      setOpen(false);
      setEdit(null);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(r: Row) {
    if (
      !confirm(
        "¿Eliminar este registro y su archivo? Esta acción no se puede deshacer.",
      )
    )
      return;
    try {
      await save({ action: "deleteEntry", id: r.id });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  return (
    <>
      {kind === "symptom" && (
        <div className="notice">
          Este registro es personal y no emite diagnósticos. Si sentís que
          necesitás atención urgente, contactá al servicio de emergencias o a tu
          equipo de salud. La biblioteca de señales de alerta está pendiente de
          revisión profesional.
        </div>
      )}
      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Buscar registros"
            placeholder="Buscar en tus recuerdos…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button
          className="primary"
          onClick={() => {
            setOpen(!open);
            setEdit(null);
          }}
        >
          <Plus size={18} /> Nuevo registro
        </button>
      </div>
      {err && (
        <p className="error" role="alert">
          {err}
        </p>
      )}
      {open && (
        <form
          className="card form-grid"
          onSubmit={submit}
          key={edit?.id || "new"}
        >
          <Field
            label="Título"
            name="title"
            defaultValue={edit?.title}
            required
            maxLength={150}
          />
          <Field
            label="Fecha"
            name="date"
            type="date"
            required
            defaultValue={
              edit?.date?.slice(0, 10) || new Date().toLocaleDateString("en-CA")
            }
          />
          <label className="full">
            {kind === "symptom"
              ? "Estado general, náuseas, cansancio, dolor de cabeza u otros síntomas"
              : "Tu recuerdo"}
            <textarea name="text" defaultValue={edit?.text} maxLength={20000} />
          </label>
          <Field
            label="¿Cómo te sentís? (opcional)"
            name="mood"
            defaultValue={edit?.mood || ""}
            maxLength={100}
          />
          {kind !== "symptom" && (
            <Field
              label={
                media
                  ? "Archivo privado · máximo 10 MB"
                  : "Fotografías opcionales · hasta 5, máximo 10 MB por imagen"
              }
              type="file"
              name="file"
              accept={
                kind === "ultrasound"
                  ? "image/jpeg,image/png,image/webp,application/pdf"
                  : "image/jpeg,image/png,image/webp"
              }
              multiple={kind === "journal"}
              required={media && !edit}
            />
          )}
          {kind === "ultrasound" && (
            <label>
              Cita realizada asociada (opcional)
              <select
                name="appointmentId"
                defaultValue={edit?.appointmentId || ""}
              >
                <option value="">Sin asociar</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} · {new Date(a.at).toLocaleDateString("es-AR")}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Guardando…" : "Guardar registro"}
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Cancelar
          </button>
        </form>
      )}
      {kind === "belly" && rows.length > 1 && (
        <section className="card">
          <h2>Tu pancita, paso a paso</h2>
          <div className="comparison">
            {(compare.length === 2
              ? rows.filter((r) => compare.includes(r.id))
              : [rows[slide]]
            ).map((r) => (
              <figure key={r.id}>
                <img alt={r.title} src={"/api/files?id=" + r.fileId} />
                <figcaption>{r.title}</figcaption>
              </figure>
            ))}
          </div>
          <label>
            Recorrer evolución
            <input
              aria-label="Recorrer fotografías"
              type="range"
              min={0}
              max={rows.length - 1}
              value={slide}
              onChange={(e) => {
                setSlide(Number(e.target.value));
                setCompare([]);
              }}
            />
          </label>
          <p>Seleccioná dos fotografías de la galería para compararlas.</p>
        </section>
      )}
      {rows.length === 0 ? (
        <Empty
          title="El primer recuerdo está por llegar"
          text="Este es tu espacio privado. Guardá lo que quieras recordar, a tu ritmo."
        />
      ) : (
        <div className="entries-grid">
          {rows
            .filter((r) =>
              (r.title + " " + r.text)
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((r) => (
              <article className="card entry" key={r.id}>
                {r.file && r.file.mime !== "application/pdf" && (
                  <a
                    href={"/api/files?id=" + r.fileId}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img alt={r.title} src={"/api/files?id=" + r.fileId} />
                  </a>
                )}
                {r.file?.mime === "application/pdf" && (
                  <a
                    className="inline-link"
                    href={"/api/files?id=" + r.fileId}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <BookOpen /> Abrir documento PDF
                  </a>
                )}
                {r.attachments?.map((a: Row) => (
                  <div className="journal-photo" key={a.id}>
                    <a
                      href={"/api/files?id=" + a.fileId}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img alt={r.title} src={"/api/files?id=" + a.fileId} />
                    </a>
                    <a href={"/api/files?id=" + a.fileId + "&download=1"}>
                      Descargar fotografía
                    </a>
                    <button
                      onClick={async () => {
                        if (confirm("¿Eliminar esta fotografía?")) {
                          try {
                            await api("/api/files", { id: a.fileId }, "DELETE");
                            await load();
                          } catch (e) {
                            setErr((e as Error).message);
                          }
                        }
                      }}
                    >
                      Eliminar fotografía
                    </button>
                  </div>
                ))}
                <p className="eyebrow">
                  {r.date.slice(0, 10)} · Semana{" "}
                  {Math.floor(Math.max(0, r.gestationalDays) / 7)} +{" "}
                  {Math.max(0, r.gestationalDays) % 7}
                </p>
                <h3>{r.title}</h3>
                {r.mood && <span className="pill">{r.mood}</span>}
                <p className="preserve">{r.text}</p>
                <div className="entry-actions">
                  {r.file && (
                    <a href={"/api/files?id=" + r.fileId + "&download=1"}>
                      Descargar
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setEdit(r);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </button>
                  <button onClick={() => remove(r)}>Eliminar</button>
                  {kind === "belly" && (
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={compare.includes(r.id)}
                        onChange={(e) =>
                          setCompare(
                            e.target.checked
                              ? [...compare.slice(-1), r.id]
                              : compare.filter((id) => id !== r.id),
                          )
                        }
                      />
                      Comparar
                    </label>
                  )}
                </div>
              </article>
            ))}
        </div>
      )}
    </>
  );
}
