"use client";
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
        referenceUrls: String(d.referenceUrls).split("\n").filter(Boolean),
        review: f.has("review"),
        published: f.has("published"),
      });
      setErr("Contenido guardado");
      setData(await api("/api/admin"));
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
              key={selected?.id || "new"}
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
              <label>
                Referencias HTTPS, una por línea
                <textarea
                  name="referenceUrls"
                  required
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
                <input name="published" type="checkbox" /> Publicar contenido
                revisado
              </label>
              <button className="primary">Guardar contenido semanal</button>
            </form>
            {data.content.map((c: Row) => (
              <p key={c.id}>
                Semana {c.week} · {c.title} ·{" "}
                {c.published ? "Publicado" : "Borrador"}
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
        Subí exclusivamente originales autorizados. Usá el identificador logo o
        bee para la identidad principal.
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
          label="Identificador (logo, bee o nombre de recurso)"
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
