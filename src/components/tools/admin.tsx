"use client";
import { useEffect, useState } from "react";
import { api, type Row } from "@/lib/client";
import { Field } from "../ui";
export function ToolCatalogAdmin() {
  const [data, setData] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [name, setName] = useState<Row | null>(null),
    [template, setTemplate] = useState<Row | null>(null);
  const load = () =>
    api("/api/tools/admin")
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  const save = async (op: string, value: unknown) => {
    try {
      await api("/api/tools/admin", { op, data: value });
      setError("Catálogo guardado");
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  return (
    <section className="card">
      <h2>Catálogos de herramientas</h2>
      {error && <p role="status">{error}</p>}
      <details>
        <summary>
          Plantillas de preparativos, tarjetas y contenido revisado
        </summary>
        <select
          aria-label="Elegir plantilla administrativa"
          value={template?.id || ""}
          onChange={(e) =>
            setTemplate(
              data?.templates.find((v: Row) => v.id === e.target.value) || null,
            )
          }
        >
          <option value="">Nueva plantilla</option>
          {(data?.templates || []).map((v: Row) => (
            <option key={v.id} value={v.id}>
              {v.kind} · {v.title}
            </option>
          ))}
        </select>
        <form
          key={template?.id || "new"}
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const f = Object.fromEntries(new FormData(e.currentTarget));
              if (
                await save("template", {
                  id: template?.id,
                  slug: f.slug,
                  title: f.title,
                  kind: f.kind,
                  config: JSON.parse(String(f.config)),
                  published: f.published === "on",
                })
              )
                setTemplate(null);
            } catch {
              setError("Revisá el JSON de configuración");
            }
          }}
        >
          <Field
            name="slug"
            label="Identificador"
            required
            defaultValue={template?.slug}
          />
          <Field
            name="title"
            label="Título de plantilla"
            required
            defaultValue={template?.title}
          />
          <label>
            Tipo
            <select name="kind" defaultValue={template?.kind || "PREPARATIONS"}>
              <option value="PREPARATIONS">Preparativos</option>
              <option value="CARD">Tarjeta</option>
              <option value="REVIEWED_GUIDANCE">
                Guía revisada por profesionales
              </option>
            </select>
          </label>
          <label>
            Configuración JSON
            <textarea
              name="config"
              required
              rows={9}
              defaultValue={JSON.stringify(template?.config || [], null, 2)}
            />
          </label>
          <p>
            Preparativos: categorías con key, title e items. Tarjetas: type y
            defaultText. Guía: text y sourceUrls; al guardar se registra quién
            revisó y cuándo. La guía del cronómetro usa el identificador
            contraction-safety.
          </p>
          <label className="check">
            <input
              type="checkbox"
              name="published"
              defaultChecked={template?.published}
            />
            Publicar plantilla
          </label>
          <button>Guardar plantilla</button>
        </form>
      </details>
      <details>
        <summary>
          Catálogo de nombres · {data?.names.length || 0} registros
        </summary>
        <select
          aria-label="Editar nombre del catálogo"
          value={name?.id || ""}
          onChange={(e) =>
            setName(
              data?.names.find((v: Row) => v.id === e.target.value) || null,
            )
          }
        >
          <option value="">Nuevo nombre</option>
          {(data?.names || []).map((v: Row) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <form
          key={name?.id || "new"}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            if (
              await save("names", [
                {
                  id: name?.id,
                  name: f.name,
                  gender: f.gender,
                  origin: f.origin || null,
                  meaning: f.meaning || null,
                  source: f.source,
                  sourceUrl: f.sourceUrl || null,
                  verification: f.verification,
                  published: f.published === "on",
                  reviewStatus: String(f.reviewStatus || "editorial_initial"),
                  locale: name?.locale || "es-AR",
                  variants: String(f.variants || "")
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                  pronunciation: f.pronunciation || null,
                },
              ])
            )
              setName(null);
          }}
        >
          <Field
            label="Nombre"
            name="name"
            required
            defaultValue={name?.name}
          />
          <label>
            Uso habitual
            <select name="gender" defaultValue={name?.gender || "U"}>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
              <option value="U">Unisex</option>
            </select>
          </label>
          <Field
            label="Origen"
            name="origin"
            defaultValue={name?.origin || ""}
          />
          <label>
            Significado
            <textarea name="meaning" defaultValue={name?.meaning || ""} />
          </label>
          <Field
            label="Fuente"
            name="source"
            required
            defaultValue={name?.source}
          />
          <Field
            label="URL de fuente específica"
            name="sourceUrl"
            type="url"
            defaultValue={name?.sourceUrl || ""}
          />
          <Field
            label="Variantes separadas por coma"
            name="variants"
            defaultValue={name?.variants.join(", ") || ""}
          />
          <Field
            label="Pronunciación opcional"
            name="pronunciation"
            defaultValue={name?.pronunciation || ""}
          />
          <label>
            Verificación
            <select
              name="verification"
              defaultValue={name?.verification || "PENDING"}
            >
              <option value="PENDING">Pendiente</option>
              <option value="VERIFIED">Verificado con fuente</option>
              <option value="DISPUTED">Interpretación controvertida</option>
            </select>
          </label>
          <Field
            label="Estado editorial (no bloquea la publicación)"
            name="reviewStatus"
            defaultValue={name?.reviewStatus || "editorial_initial"}
          />
          <label className="check">
            <input
              type="checkbox"
              name="published"
              defaultChecked={name?.published ?? true}
            />
            Publicado en el buscador
          </label>
          <button>Guardar nombre</button>
        </form>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await save(
                "names",
                JSON.parse(String(new FormData(e.currentTarget).get("names"))),
              );
            } catch {
              setError("El archivo debe contener un array JSON de nombres");
            }
          }}
        >
          <label>
            Importar hasta 2000 nombres en JSON
            <textarea name="names" required rows={5} />
          </label>
          <button>Importar sin duplicar nombres existentes</button>
        </form>
      </details>
    </section>
  );
}
