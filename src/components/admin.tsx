"use client";
import { reviewLabels, measurementLabels } from "@/lib/weekly-content";
import { api, type Row } from "@/lib/client";
import { FormEvent, useEffect, useState } from "react";
import { Field } from "./ui";
export function Admin() {
  const [data, setData] = useState<Row | null>(null),
    [err, setErr] = useState(""),
    [selected, setSelected] = useState<Row | null>(null);
  useEffect(() => {
    api("/api/admin")
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      d = Object.fromEntries(f);
    try {
      await api("/api/admin", {
        ...d,
        illustrationId: d.illustrationId || null,
        week: Number(d.week),
        trimester: d.trimester ? Number(d.trimester) : null,
        lengthCm: d.lengthCm ? Number(d.lengthCm) : null,
        lengthMinCm: d.lengthMinCm ? Number(d.lengthMinCm) : null,
        lengthMaxCm: d.lengthMaxCm ? Number(d.lengthMaxCm) : null,
        measurementMethod: d.measurementMethod || null,
        maternalChanges: d.maternalChanges || null,
        developmentHighlights: String(d.developmentHighlights || "")
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
        referenceUrls: String(d.referenceUrls).split("\n").filter(Boolean),
        review: f.has("review"),
        published: f.has("published"),
        editorialPublished:
          data?.role === "ADMIN" && f.has("editorialPublished"),
      });
      setErr("Contenido guardado");
      const refreshed = await api("/api/admin");
      setData(refreshed);
      setSelected(
        refreshed.content.find((row: Row) => row.week === Number(d.week)) ||
          null,
      );
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  return (
    <>
      <BrandManager />
      <p role="status">{err}</p>
      {data && (
        <>
          <div className="quick-grid">
            {[
              ["Usuarios", data.users],
              ["Embarazos activos", data.pregnancies],
              ["Registros", data.entries],
              ["Altas (30 días)", data.newUsers],
            ].map(([k, v]) => (
              <div className="card" key={k}>
                <h3>{v}</h3>
                <p>{k}</p>
              </div>
            ))}
          </div>
          <section className="card">
            <h2>Biblioteca editorial</h2>
            <p>
              La revisión debe ser realizada por un profesional autorizado.
              Cambiar un texto invalida su revisión anterior.
            </p>
            <label>
              Editar una semana existente
              <select
                value={selected?.week || ""}
                onChange={(e) =>
                  setSelected(
                    data.content.find(
                      (c: Row) => c.week === Number(e.target.value),
                    ) || null,
                  )
                }
              >
                <option value="">Nuevo contenido</option>
                {data.content.map((c: Row) => (
                  <option key={c.id} value={c.week}>
                    Semana {c.week} · {c.title}
                  </option>
                ))}
              </select>
            </label>
            <form
              className="form-grid"
              onSubmit={submit}
              key={selected ? selected.id + ":" + selected.updatedAt : "new"}
            >
              <Field
                label="Semana"
                type="number"
                name="week"
                min={1}
                max={42}
                required
                defaultValue={selected?.week}
              />
              {["title", "summary", "fruit", "measurement"].map((n) => (
                <Field
                  key={n}
                  label={
                    (
                      {
                        title: "Título",
                        summary: "Resumen",
                        fruit: "Comparación de fruta",
                        measurement: "Medidas orientativas",
                      } as Row
                    )[n]
                  }
                  name={n}
                  required
                  defaultValue={selected?.[n]}
                />
              ))}
              <label>
                Desarrollo detallado
                <textarea
                  name="details"
                  required
                  defaultValue={selected?.details}
                />
              </label>
              <Field
                label="Trimestre editorial"
                type="number"
                name="trimester"
                min={1}
                max={3}
                defaultValue={selected?.trimester || ""}
              />
              <label>
                Método de medición
                <select
                  name="measurementMethod"
                  defaultValue={selected?.measurementMethod || ""}
                >
                  <option value="">Pendiente de especificar</option>
                  {Object.entries(measurementLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Longitud orientativa (cm; vacío = sin medida)"
                name="lengthCm"
                type="number"
                min="0.001"
                step="any"
                defaultValue={selected?.lengthCm ?? ""}
              />
              <Field
                label="Rango mínimo (cm)"
                name="lengthMinCm"
                type="number"
                min="0.001"
                step="any"
                defaultValue={selected?.lengthMinCm ?? ""}
              />
              <Field
                label="Rango máximo (cm)"
                name="lengthMaxCm"
                type="number"
                min="0.001"
                step="any"
                defaultValue={selected?.lengthMaxCm ?? ""}
              />
              <label>
                Hitos, uno por línea
                <textarea
                  name="developmentHighlights"
                  defaultValue={
                    selected?.developmentHighlights?.join("\n") || ""
                  }
                />
              </label>
              <label>
                ¿Qué puede estar pasando en tu cuerpo?
                <textarea
                  name="maternalChanges"
                  defaultValue={selected?.maternalChanges || ""}
                />
              </label>
              <label>
                Estado del borrador
                <select
                  name="reviewStatus"
                  defaultValue={
                    selected?.reviewStatus === "DRAFT"
                      ? "DRAFT"
                      : "PENDING_REVIEW"
                  }
                >
                  <option value="DRAFT">Borrador</option>
                  <option value="PENDING_REVIEW">
                    Pendiente de revisión profesional
                  </option>
                </select>
              </label>
              {selected && (
                <p className="full">
                  {reviewLabels[selected.reviewStatus]} ·{" "}
                  {selected.published || selected.editorialPublished
                    ? "Visible en la aplicación"
                    : "No publicado"}{" "}
                  · Versión: {selected.contentVersion || "Edición manual"}.
                  Fuentes pendientes de contraste:{" "}
                  {selected.sourceNames?.join(", ") || "Sin fuentes propuestas"}
                  . Los textos y medidas del adjunto no están validados
                  médicamente.
                </p>
              )}
              <label>
                Referencias HTTPS, una por línea
                <textarea
                  name="referenceUrls"
                  defaultValue={selected?.referenceUrls?.join("\n")}
                />
              </label>
              <label>
                Ilustración aprobada
                <select
                  name="illustrationId"
                  defaultValue={selected?.illustrationId || ""}
                >
                  <option value="">Sin ilustración</option>
                  {data.assets.map((a: Row) => (
                    <option value={a.id} key={a.id}>
                      {a.slug}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check">
                <input name="review" type="checkbox" /> Registrar revisión
                profesional con mi usuario
              </label>
              <label className="check">
                <input
                  name="editorialPublished"
                  type="checkbox"
                  disabled={data.role !== "ADMIN"}
                  defaultChecked={
                    data.role === "ADMIN" && !!selected?.editorialPublished
                  }
                />{" "}
                Publicar como contenido educativo con aviso de revisión
                pendiente
              </label>
              <p className="full">
                La publicación editorial es independiente de la aprobación
                médica. Una edición de contenido aprobado requiere registrar su
                revisión nuevamente.
              </p>
              <label className="check">
                <input
                  name="published"
                  type="checkbox"
                  defaultChecked={selected?.published}
                />{" "}
                Publicar contenido revisado
              </label>
              <button className="primary">Guardar contenido semanal</button>
            </form>
            {data.content.map((c: Row) => (
              <p key={c.id}>
                Semana {c.week} · {c.title} ·{" "}
                {reviewLabels[c.reviewStatus] || "Borrador"} ·{" "}
                {c.published || c.editorialPublished
                  ? "Visible en la aplicación"
                  : "No publicado"}
              </p>
            ))}
          </section>
          <section className="card">
            <h2>Cuentas · información básica</h2>
            {data.accounts.map((a: Row) => (
              <p key={a.id}>
                {a.name} · {a.email} · {a.role}
              </p>
            ))}
          </section>
        </>
      )}
    </>
  );
}
function BrandManager() {
  const [message, setMessage] = useState("");
  return (
    <section className="card">
      <h2>Recursos gráficos aprobados</h2>
      <p>
        El logo y el isotipo oficiales se incluyen con la aplicación. Subí otros
        recursos autorizados; usá bee para la mascota y nombres específicos para
        las ilustraciones semanales.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const f = new FormData(e.currentTarget);
            f.set("kind", "brand");
            const response = await fetch("/api/files", {
              method: "POST",
              body: f,
            });
            const file = await response.json();
            if (!response.ok) throw new Error(file.error);
            await api("/api/brand", {
              slug: f.get("slug"),
              fileId: file.id,
              published: f.has("published"),
            });
            setMessage("Recurso guardado");
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        <Field
          label="Identificador (bee o nombre de recurso)"
          name="slug"
          required
          pattern="[a-z0-9-]{1,64}"
        />
        <Field
          label="Imagen original"
          name="file"
          type="file"
          accept="image/png,image/webp,image/jpeg"
          required
        />
        <label className="check">
          <input type="checkbox" name="published" /> Publicar como recurso
          gráfico de marca, visible para todas las personas
        </label>
        <button className="primary">Guardar recurso</button>
      </form>
      <p role="status">{message}</p>
    </section>
  );
}
