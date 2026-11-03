"use client";
import { useEffect, useState } from "react";
import type { Row } from "@/lib/client";
import { useTool, ToolStatus } from "./common";
export function Timelapse({ pregnancyId }: { pregnancyId: string }) {
  const t = useTool("timelapse", pregnancyId),
    [selected, setSelected] = useState<Row[]>([]),
    [seconds, setSeconds] = useState(2),
    [format, setFormat] = useState("vertical"),
    [transition, setTransition] = useState("fade"),
    [options, setOptions] = useState({
      showWeek: false,
      showDate: false,
      showName: false,
      showBrand: true,
    }),
    [preview, setPreview] = useState(false),
    [frame, setFrame] = useState(0);
  const photos: Row[] = (t.data?.photos || []).flatMap((e: Row) =>
    [e.file, ...e.attachments.map((a: Row) => a.file)]
      .filter((f: Row | null) => f?.mime.startsWith("image/"))
      .map((f: Row) => ({
        entryId: e.id,
        fileId: f.id,
        date: e.date,
        title: e.title,
      })),
  );
  useEffect(() => {
    if (!preview || !selected.length) return;
    const timer = setInterval(
      () => setFrame((i) => (i + 1) % selected.length),
      seconds * 1000,
    );
    return () => clearInterval(timer);
  }, [preview, seconds, selected.length]);
  useEffect(() => {
    if (
      !t.data?.jobs.some((j: Row) =>
        ["QUEUED", "PROCESSING"].includes(j.status),
      )
    )
      return;
    const timer = setInterval(() => void t.load(), 3000);
    return () => clearInterval(timer);
  }, [t.data?.jobs, t.load]);
  const move = (i: number, offset: number) => {
    const j = i + offset;
    if (j < 0 || j >= selected.length) return;
    const copy = [...selected];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setSelected(copy);
  };
  return (
    <>
      <h2>Crear mi evolución</h2>
      <p>
        Usamos únicamente las fotografías privadas de tu pancita. La vista
        previa es orientativa; el video final se genera como MP4 privado y vence
        después de 7 días.
      </p>
      <ToolStatus {...t} />
      {t.data && !t.data.available && (
        <p className="editorial-notice">
          La exportación MP4 necesita habilitar el trabajador multimedia
          privado. Podés preparar y guardar tu proyecto; no se simula una
          generación sin ese servicio.
        </p>
      )}
      <section className="card">
        <h3>Elegí tus fotos</h3>
        <div className="tool-photo-grid">
          {photos.map((p) => (
            <label key={p.fileId}>
              <img src={`/api/files?id=${p.fileId}`} alt={p.title} />
              <span className="check">
                <input
                  type="checkbox"
                  checked={selected.some((s) => s.fileId === p.fileId)}
                  onChange={(e) => {
                    setFrame(0);
                    setSelected(
                      e.target.checked
                        ? [...selected, p]
                        : selected.filter((s) => s.fileId !== p.fileId),
                    );
                  }}
                />
                {new Date(p.date).toLocaleDateString("es-AR", {
                  timeZone: "UTC",
                })}
              </span>
            </label>
          ))}
        </div>
        {!photos.length && (
          <p>Primero guardá al menos dos fotos en Mi pancita.</p>
        )}
        <div className="tool-actions">
          <button
            onClick={() =>
              setSelected(
                [...selected].sort((a, b) => a.date.localeCompare(b.date)),
              )
            }
          >
            Orden cronológico
          </button>
          <button
            disabled={selected.length < 2}
            onClick={() => {
              setFrame(0);
              setPreview(!preview);
            }}
          >
            {preview ? "Detener vista previa" : "Ver vista previa"}
          </button>
        </div>
        {selected.map((p, i) => (
          <div className="tool-row" key={p.fileId}>
            <span>
              {i + 1}. {p.title}
            </span>
            <button disabled={i === 0} onClick={() => move(i, -1)}>
              ↑ Subir
            </button>
            <button
              disabled={i === selected.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓ Bajar
            </button>
          </div>
        ))}
        {preview && selected[frame] && (
          <img
            className={`timelapse-preview ${format}`}
            src={`/api/files?id=${selected[frame].fileId}`}
            alt={`Vista previa, foto ${frame + 1}`}
          />
        )}
      </section>
      <form
        className="card form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          await t.act("save", {
            photos: selected.map(({ entryId, fileId }) => ({
              entryId,
              fileId,
            })),
            seconds,
            format,
            transition,
            ...options,
          });
        }}
      >
        <label>
          Segundos por foto
          <input
            type="number"
            min={0.5}
            max={5}
            step={0.5}
            value={seconds}
            onChange={(e) => setSeconds(Number(e.target.value))}
          />
        </label>
        <label>
          Formato
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="vertical">Vertical 9:16</option>
            <option value="square">Cuadrado 1:1</option>
            <option value="landscape">Horizontal 16:9</option>
          </select>
        </label>
        <label>
          Transición
          <select
            value={transition}
            onChange={(e) => setTransition(e.target.value)}
          >
            <option value="fade">Fundido suave</option>
            <option value="cut">Corte directo</option>
          </select>
        </label>
        {(
          [
            ["showWeek", "Mostrar semana"],
            ["showDate", "Mostrar fecha"],
            ["showName", "Mostrar apodo"],
            ["showBrand", "Mostrar marca BAMBEE"],
          ] as const
        ).map(([key, label]) => (
          <label className="check" key={key}>
            <input
              type="checkbox"
              checked={options[key]}
              onChange={(e) =>
                setOptions({ ...options, [key]: e.target.checked })
              }
            />
            {label}
          </label>
        ))}
        <p>
          {selected.length} fotos · {selected.length * seconds} segundos (máximo
          30 fotos y 120 segundos)
        </p>
        <button className="primary" disabled={t.busy || selected.length < 2}>
          Guardar proyecto de video
        </button>
      </form>
      <h3>Mis proyectos</h3>
      {(t.data?.jobs || []).map((j: Row) => (
        <article className="card" key={j.id}>
          <h3>
            Evolución · {new Date(j.createdAt).toLocaleDateString("es-AR")}
          </h3>
          <p>
            {
              (
                {
                  DRAFT: "Proyecto guardado",
                  QUEUED: "En cola",
                  PROCESSING: "Generando MP4",
                  READY: "Video listo",
                  FAILED: "No se pudo generar",
                  EXPIRED: "El video temporal venció",
                } as Row
              )[j.status]
            }
          </p>
          {["QUEUED", "PROCESSING"].includes(j.status) && (
            <>
              <progress max={100} value={j.progress} />
              <span>{j.progress}% de etapas completadas</span>
            </>
          )}
          {j.error && <p className="error">{j.error}</p>}
          {j.status === "READY" && (
            <>
              <video
                className="timelapse-preview"
                controls
                preload="metadata"
                src={`/api/tools/media?id=${j.id}`}
              />
              <a
                className="button"
                href={`/api/tools/media?id=${j.id}&download=1`}
              >
                Descargar MP4
              </a>
            </>
          )}
          <div className="tool-actions">
            {["DRAFT", "FAILED"].includes(j.status) && (
              <button
                className="primary"
                disabled={!t.data?.available || t.busy}
                onClick={() => void t.act("generate", { id: j.id })}
              >
                Generar video MP4
              </button>
            )}
            <button
              onClick={() => {
                setSelected(
                  j.config.photos
                    .map((p: Row) => photos.find((v) => v.fileId === p.fileId))
                    .filter(Boolean),
                );
                setSeconds(j.config.seconds);
                setFormat(j.config.format);
                setTransition(j.config.transition);
                setOptions({
                  showWeek: j.config.showWeek,
                  showDate: j.config.showDate,
                  showName: j.config.showName,
                  showBrand: j.config.showBrand,
                });
              }}
            >
              Usar configuración
            </button>
            <button
              disabled={j.status === "PROCESSING"}
              onClick={() => {
                if (confirm("¿Eliminar este proyecto y su video privado?"))
                  void t.act("delete", { id: j.id });
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
