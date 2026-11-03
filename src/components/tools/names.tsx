"use client";
import { useEffect, useRef, useState } from "react";
import { api, type Row } from "@/lib/client";
import { Empty, Field } from "../ui";
import { ToolStatus } from "./common";
import { useRouter } from "next/navigation";
export function BabyNames({
  pregnancyId,
  signInUrl = "/acceso?next=/nombres",
}: {
  pregnancyId?: string;
  signInUrl?: string;
}) {
  const router = useRouter();
  const requestVersion = useRef(0);
  const [data, setData] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [filters, setFilters] = useState({
      q: "",
      gender: "",
      first: "",
      origin: "",
      min: "",
      max: "",
    }),
    [favorites, setFavorites] = useState(false),
    [discover, setDiscover] = useState(false),
    [compared, setCompared] = useState<Row[]>([]),
    [meaning, setMeaning] = useState(false),
    [page, setPage] = useState(1);
  const load = async () => {
    const version = ++requestVersion.current;
    try {
      const result = await api(
        `${pregnancyId ? `/api/tools?module=names&pregnancyId=${pregnancyId}&` : "/api/names?"}${new URLSearchParams(filters)}&page=${discover ? 1 : page}&favorites=${favorites}&discover=${discover}`,
      );
      if (version !== requestVersion.current) return;
      setData(result);
      setError("");
    } catch (error) {
      if (version === requestVersion.current)
        setError((error as Error).message);
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => void load(), 180);
    return () => {
      clearTimeout(timer);
      ++requestVersion.current;
    };
  }, [pregnancyId, JSON.stringify(filters), page, favorites, discover]);
  useEffect(() => setPage(1), [JSON.stringify(filters), favorites, discover]);
  useEffect(() => {
    if (data && data.page > data.totalPages) setPage(data.totalPages);
  }, [data?.page, data?.totalPages]);
  const choose = async (nameId: string, changes: Row) => {
    if (!pregnancyId) {
      router.push(signInUrl);
      return;
    }
    if (data?.canVote === false) {
      setError(
        "El titular del embarazo debe autorizar la votación desde Familia.",
      );
      return;
    }
    setBusy(true);
    try {
      const c = data?.choices.find((c: Row) => c.nameId === nameId);
      await api("/api/tools", {
        pregnancyId,
        module: "names",
        op: "choose",
        data: {
          nameId,
          favorite: c?.favorite || false,
          vote: c?.vote || null,
          note: c?.note || "",
          shared: c?.shared || false,
          finalist: c?.finalist || false,
          ...changes,
        },
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const all: Row[] = data?.names || [],
    choices: Row[] = data?.choices || [],
    names = all,
    card = names.find((n) => !choices.find((c) => c.nameId === n.id)?.vote);
  const item = (n: Row) => {
    const c = choices.find((c) => c.nameId === n.id),
      votes = (data?.partnerVotes || []).filter((v: Row) => v.nameId === n.id),
      match =
        !!c?.vote &&
        ["LIKE", "FAVORITE"].includes(c.vote) &&
        votes.some((v: Row) => ["LIKE", "FAVORITE"].includes(v.vote));
    return (
      <article className="card baby-name-card" key={n.id}>
        <p className="eyebrow">
          {n.gender === "F"
            ? "Uso femenino"
            : n.gender === "M"
              ? "Uso masculino"
              : "Uso unisex"}
        </p>
        <h2>{n.name}</h2>
        {n.origin && <p>{n.origin}</p>}
        {(!discover || meaning) && (
          <>
            {n.meaning && <p>{n.meaning}</p>}
            {n.verification === "DISPUTED" && (
              <p>Interpretación controvertida; puede tener otras lecturas.</p>
            )}
            <small>
              {n.source}
              {n.sourceUrl && (
                <>
                  {" "}
                  ·{" "}
                  <a href={n.sourceUrl} target="_blank" rel="noreferrer">
                    Fuente
                  </a>
                </>
              )}
            </small>
            {n.variants?.length > 0 && (
              <p>Variantes: {n.variants.join(", ")}</p>
            )}
            {n.pronunciation && <p>Pronunciación: {n.pronunciation}</p>}
          </>
        )}
        {match && <p className="name-match">♥ ¡Coincidieron!</p>}
        {votes.map((v: Row, i: number) => (
          <small key={i}>
            {v.person}:{" "}
            {v.vote === "FAVORITE"
              ? "Favorito"
              : v.vote === "LIKE"
                ? "Me gusta"
                : v.vote === "NO"
                  ? "No me convence"
                  : "Pasó"}
            {v.finalist ? " · Candidato final" : ""}
          </small>
        ))}
        <div className="tool-actions">
          <button
            disabled={busy}
            className={c?.vote === "LIKE" ? "selected" : ""}
            onClick={() => void choose(n.id, { vote: "LIKE" })}
          >
            Me gusta
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void choose(n.id, { vote: discover ? "PASS" : "NO" })
            }
          >
            {discover ? "Pasar" : "No me convence"}
          </button>
          <button
            disabled={busy}
            className={c?.favorite ? "selected" : ""}
            onClick={() =>
              void choose(n.id, {
                favorite: !c?.favorite,
                vote: !c?.favorite ? "FAVORITE" : c?.vote,
              })
            }
          >
            {c?.favorite ? "Quitar favorito" : "Favorito"}
          </button>
          {discover && (
            <button onClick={() => setMeaning(!meaning)}>
              Ver significado
            </button>
          )}
        </div>
        {pregnancyId && data?.canVote !== false && (
          <>
            <label className="check">
              <input
                type="checkbox"
                checked={!!c?.shared}
                disabled={busy}
                onChange={(e) =>
                  void choose(n.id, { shared: e.target.checked })
                }
              />
              Mostrar mi voto antes de la coincidencia
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={!!c?.finalist}
                disabled={busy}
                onChange={(e) =>
                  void choose(n.id, { finalist: e.target.checked })
                }
              />
              Candidato final
            </label>
          </>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={compared.some((value) => value.id === n.id)}
            onChange={(e) =>
              setCompared(
                e.target.checked
                  ? [...compared, n].slice(-4)
                  : compared.filter((value) => value.id !== n.id),
              )
            }
          />
          Comparar
        </label>
        {pregnancyId && data?.canVote !== false && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void choose(n.id, {
                note: new FormData(e.currentTarget).get("note"),
              });
            }}
          >
            <label>
              Nota privada
              <textarea
                name="note"
                maxLength={5000}
                defaultValue={c?.note || ""}
                key={c?.note || "empty"}
              />
            </label>
            <button disabled={busy}>Guardar nota privada</button>
          </form>
        )}
      </article>
    );
  };
  return (
    <>
      <h2>Nombres para mi bebé</h2>
      <p>
        Los orígenes y significados se muestran tal como fueron aportados.
        Cuando una etimología es incierta o debatida, conservamos esa
        aclaración.
      </p>
      <p>
        Buscá, descubrí y elegí a tu ritmo. Los votos se muestran a la pareja
        autorizada cuando ambos participaron, salvo que decidas compartirlos
        antes. Las notas siempre son privadas.
      </p>
      <ToolStatus error={error} loading={!data} />
      <form className="card form-grid" onSubmit={(e) => e.preventDefault()}>
        <Field
          label="Buscar nombre"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <Field
          label="Primera letra"
          maxLength={1}
          value={filters.first}
          onChange={(e) => setFilters({ ...filters, first: e.target.value })}
        />
        <label>
          Género de uso habitual
          <select
            value={filters.gender}
            onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
            <option value="U">Unisex</option>
          </select>
        </label>
        <label>
          Origen
          <select
            value={filters.origin}
            onChange={(e) => setFilters({ ...filters, origin: e.target.value })}
          >
            <option value="">Todos</option>
            {(data?.origins || []).map((v: string) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <Field
          label="Longitud mínima"
          type="number"
          min={0}
          max={60}
          value={filters.min}
          onChange={(e) => setFilters({ ...filters, min: e.target.value })}
        />
        <Field
          label="Longitud máxima"
          type="number"
          min={1}
          max={60}
          value={filters.max}
          onChange={(e) => setFilters({ ...filters, max: e.target.value })}
        />
      </form>
      <div className="tool-actions">
        <button
          className={favorites ? "selected" : ""}
          onClick={() => {
            if (!pregnancyId) {
              router.push(signInUrl);
              return;
            }
            setFavorites(!favorites);
          }}
        >
          Mis favoritos
        </button>
        <button
          className={discover ? "selected" : ""}
          onClick={() => setDiscover(!discover)}
        >
          Modo descubrimiento
        </button>
      </div>
      {compared.length > 0 && (
        <section className="card">
          <h3>Comparar candidatos</h3>
          <div className="tool-grid">
            {compared.map((n) => (
              <div key={n.id}>
                <strong>{n.name}</strong>
                {n.origin && <p>{n.origin}</p>}
                {n.meaning && <p>{n.meaning}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="tool-grid">
        {discover ? (
          card ? (
            item(card)
          ) : (
            <Empty
              title="Ya exploraste estos nombres"
              text="Cambiá los filtros o volvé a la lista para revisar tus elecciones."
            />
          )
        ) : (
          names.map(item)
        )}
      </div>
      {!discover && data && (
        <nav
          className="tool-actions name-pagination"
          aria-label="Paginación de nombres"
        >
          <button disabled={data.page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </button>
          <span>
            Página {data.page} de {data.totalPages} · {data.total} nombres
          </span>
          <button
            disabled={data.page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
      {!discover && !names.length && data && (
        <Empty
          title="Busquemos otro nombre"
          text="No hay resultados para estos filtros. Probá una búsqueda más amplia."
        />
      )}
    </>
  );
}
