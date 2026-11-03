"use client";
import { useEffect, useState } from "react";
import type { Row } from "@/lib/client";
import { ToolStatus, useTool, downloadBlob } from "./common";
import { Field } from "../ui";
export function ShareCards({
  pregnancyId,
  userId,
}: {
  pregnancyId: string;
  userId: string;
}) {
  const t = useTool("cards", pregnancyId),
    [edit, setEdit] = useState<Row>({
      templateId: "",
      text: "",
      background: "cream",
      format: "story",
      showGestation: false,
      shared: false,
      fileId: null,
      medicalConsent: false,
      illustration: "brand",
    }),
    [preview, setPreview] = useState(""),
    [blob, setBlob] = useState<Blob | null>(null),
    [rendering, setRendering] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const photos: Row[] = (t.data?.photos || []).flatMap((e: Row) =>
    [e.file, ...e.attachments.map((a: Row) => a.file)]
      .filter((f: Row | null) => f?.mime.startsWith("image/"))
      .map((f: Row) => ({ ...f, kind: e.kind, title: e.title })),
  );
  const render = async (id: string) => {
    setRendering(true);
    try {
      const response = await fetch(`/api/tools/cards?id=${id}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error((await response.json()).error);
      const png = await response.blob();
      setBlob(png);
      setPreview(URL.createObjectURL(png));
    } catch (e) {
      t.setError((e as Error).message);
    } finally {
      setRendering(false);
    }
  };
  const upload = async (file: File) => {
    try {
      const f = new FormData();
      f.set("file", file);
      f.set("kind", "share-card");
      const r = await fetch("/api/files", { method: "POST", body: f }),
        v = await r.json();
      if (!r.ok) throw new Error(v.error);
      setEdit({ ...edit, fileId: v.id, medicalConsent: false });
    } catch (e) {
      t.setError((e as Error).message);
    }
  };
  return (
    <>
      <h2>Compartir mi embarazo</h2>
      <p>
        Elegí qué contar. Ninguna tarjeta se publica automáticamente; vos
        decidís si descargarla o compartirla.
      </p>
      <ToolStatus {...t} />
      <div className="tool-grid">
        <form
          className="card"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await t.act("save", edit);
            if (result?.id) {
              setEdit(result);
              await render(result.id);
            }
          }}
        >
          <label>
            Plantilla
            <select
              required
              value={edit.templateId}
              onChange={(e) => {
                const v = t.data?.templates.find(
                  (v: Row) => v.id === e.target.value,
                );
                setEdit({
                  ...edit,
                  templateId: e.target.value,
                  text: v?.config.defaultText || edit.text,
                });
              }}
            >
              <option value="">Elegí un diseño</option>
              {(t.data?.templates || []).map((v: Row) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tu mensaje
            <textarea
              required
              value={edit.text}
              maxLength={240}
              onChange={(e) => setEdit({ ...edit, text: e.target.value })}
            />
          </label>
          <label>
            Fondo
            <select
              value={edit.background}
              onChange={(e) => setEdit({ ...edit, background: e.target.value })}
            >
              <option value="cream">Crema</option>
              <option value="coral">Coral</option>
              <option value="mint">Menta</option>
              <option value="butter">Manteca</option>
            </select>
          </label>
          <label>
            Formato
            <select
              value={edit.format}
              onChange={(e) => setEdit({ ...edit, format: e.target.value })}
            >
              <option value="story">Historia · 1080 × 1920</option>
              <option value="square">Cuadrado · 1080 × 1080</option>
              <option value="portrait">Vertical · 1080 × 1350</option>
            </select>
          </label>
          <label>
            Ilustración
            <select
              value={edit.illustration}
              onChange={(e) =>
                setEdit({ ...edit, illustration: e.target.value })
              }
            >
              <option value="brand">BAMBEE</option>
              <option value="fruit">Fruta de la semana</option>
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={edit.showGestation}
              onChange={(e) =>
                setEdit({ ...edit, showGestation: e.target.checked })
              }
            />
            Incluir datos de gestación correspondientes al diseño (semana,
            cuenta regresiva o mes estimado)
          </label>
          <label>
            Fotografía autorizada
            <select
              value={edit.fileId || ""}
              onChange={(e) =>
                setEdit({
                  ...edit,
                  fileId: e.target.value || null,
                  medicalConsent: false,
                })
              }
            >
              <option value="">Sin foto</option>
              {photos.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.kind === "ultrasound" ? "Ecografía privada · " : ""}
                  {f.title} · {f.name}
                </option>
              ))}
              {edit.fileId && !photos.some((f) => f.id === edit.fileId) && (
                <option value={edit.fileId}>
                  Imagen subida para esta tarjeta
                </option>
              )}
            </select>
          </label>
          <Field
            label="O subir una foto para la tarjeta (máximo 10 MB)"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              if (e.target.files?.[0]) void upload(e.target.files[0]);
            }}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={edit.medicalConsent}
              onChange={(e) =>
                setEdit({ ...edit, medicalConsent: e.target.checked })
              }
            />
            Confirmo expresamente que quiero incluir el archivo médico privado
            seleccionado, si corresponde
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={edit.shared}
              onChange={(e) => setEdit({ ...edit, shared: e.target.checked })}
            />
            Compartir la configuración con la pareja autorizada (las fotos
            privadas solo puede exportarlas su titular)
          </label>
          <button className="primary" disabled={t.busy || rendering}>
            Guardar y previsualizar PNG
          </button>
          <button
            type="button"
            onClick={() => {
              setEdit({ ...edit, id: undefined });
              setBlob(null);
              setPreview("");
            }}
          >
            Crear otra tarjeta
          </button>
        </form>
        <section className="card card-preview">
          {preview ? (
            <>
              <img src={preview} alt="Vista previa de tu tarjeta BAMBEE" />
              <div className="tool-actions">
                <button
                  className="primary"
                  onClick={() =>
                    blob && downloadBlob(blob, "bambee-tarjeta.png")
                  }
                >
                  Descargar PNG
                </button>
                <button
                  onClick={async () => {
                    if (!blob) return;
                    const file = new File([blob], "bambee-tarjeta.png", {
                      type: "image/png",
                    });
                    try {
                      if (navigator.canShare?.({ files: [file] }))
                        await navigator.share({
                          files: [file],
                          title: "BAMBEE",
                        });
                      else downloadBlob(blob, "bambee-tarjeta.png");
                    } catch (e) {
                      if ((e as Error).name !== "AbortError")
                        t.setError(
                          "No se pudo compartir. Podés descargar la tarjeta.",
                        );
                    }
                  }}
                >
                  Compartir / guardar
                </button>
              </div>
            </>
          ) : (
            <p>
              {rendering
                ? "Generando tu imagen en alta resolución…"
                : "La vista previa aparece al guardar y generar tu tarjeta."}
            </p>
          )}
        </section>
      </div>
      <h3>Mis tarjetas guardadas</h3>
      <div className="tool-grid">
        {(t.data?.cards || []).map((c: Row) => (
          <article className="card" key={c.id}>
            <h3>
              {t.data?.templates.find((v: Row) => v.id === c.templateId)
                ?.title || "Tarjeta"}
            </h3>
            <p>{c.text}</p>
            <small>{new Date(c.createdAt).toLocaleDateString("es-AR")}</small>
            <div className="tool-actions">
              <button onClick={() => void render(c.id)} disabled={rendering}>
                Regenerar
              </button>
              {c.userId === userId && (
                <>
                  <button onClick={() => setEdit(c)}>Editar</button>
                  <button
                    onClick={() => {
                      if (confirm("¿Eliminar esta configuración?"))
                        void t.act("delete", { id: c.id });
                    }}
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
