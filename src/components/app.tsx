"use client";
import { ToolsHub, toolLinks } from "./tools/hub";
import { Preparations } from "./tools/preparations";
import { Questions } from "./tools/questions";
import { BabyNames } from "./tools/names";
import { ShareCards } from "./tools/cards";
import { Timelapse } from "./tools/timelapse";
import { Contractions } from "./tools/contractions";
import {
  clearLocalContractions,
  latestOfflineContractionScope,
} from "@/modules/tools/offline-contractions";

import { api, ApiError, type Row } from "@/lib/client";
import { Bell, Heart, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AcceptInvitation } from "./accept-invitation";
import { Access } from "./access";
import { Admin } from "./admin";
import { Agenda } from "./agenda";
import { Dashboard } from "./dashboard";
import { Entries } from "./entries";
import { Family } from "./family";
import { extra, sections } from "./navigation";
import { Notifications } from "./notifications";
import { Onboarding } from "./onboarding";
import { Preferences } from "./preferences";
import { Empty, Logo } from "./ui";
import { Weekly } from "./weekly";
export function App() {
  const path = usePathname(),
    router = useRouter();
  const [data, setData] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState("");
  const [offlineTimer, setOfflineTimer] = useState<{
    userId: string;
    pregnancyId: string;
  } | null>(null);
  const refreshVersion = useRef(0);
  const refresh = async () => {
    const version = ++refreshVersion.current;
    try {
      const d = await api("/api/data?pregnancyId=" + selected);
      if (version !== refreshVersion.current) return;
      setData(d);
      setOfflineTimer(null);
      setError("");
    } catch (e) {
      if (version !== refreshVersion.current) return;
      if (!navigator.onLine && path === "/contracciones") {
        const timer = await latestOfflineContractionScope();
        if (version === refreshVersion.current) setOfflineTimer(timer);
      } else setOfflineTimer(null);
      if (e instanceof ApiError && e.status === 403) {
        setData(null);
        setSelected("");
      }
      setError((e as Error).message);
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  };
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js");
  }, []);
  useEffect(() => {
    if (path === "/acceso" || path === "/legal") {
      setLoading(false);
      return;
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 60000);
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
    };
  }, [path, selected]);
  const save = async (b: Row) => {
    setError("");
    try {
      await api("/api/data", { pregnancyId: data?.pregnancy?.id, ...b });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  };
  if (path === "/legal")
    return (
      <main className="legal">
        <Logo />
        <h1>Privacidad y términos</h1>
        <strong>
          Borradores pendientes de revisión legal. No habilitar un lanzamiento
          comercial sin revisión.
        </strong>
        <p>
          BAMBEE registra información de embarazo, salud y recuerdos con tu
          consentimiento explícito. La información de salud y los archivos son
          privados. Compartir el progreso con tu familia requiere una invitación
          aceptada y permisos específicos.
        </p>
        <p>
          No utilizamos tus imágenes para entrenar inteligencia artificial. No
          ofrecemos diagnósticos ni interpretación de imágenes médicas. El
          contenido educativo requiere revisión editorial y profesional.
        </p>
        <p>
          Podés exportar tus registros y eliminar tu cuenta desde Configuración.
          La exportación incluye los metadatos de archivos; las imágenes se
          descargan individualmente con acceso autenticado. La versión de
          producción debe definir responsable del tratamiento, contacto,
          jurisdicción, retención, copias de seguridad y proveedores antes de
          aceptar usuarios reales.
        </p>
        <Link href="/acceso">Volver</Link>
      </main>
    );
  if (!loading && offlineTimer && path === "/contracciones")
    return (
      <main className="offline-timer">
        <Logo />
        <p>
          Sin conexión. Solo se recupera el cronómetro cifrado de este
          dispositivo. Al reconectar se comprobará tu sesión antes de
          sincronizar.
        </p>
        <Contractions {...offlineTimer} />
      </main>
    );
  if (path === "/nombres" && !loading && !data?.pregnancy)
    return (
      <main className="public-names">
        <Logo />
        <h1>Encontrá un nombre para tu bebé</h1>
        <BabyNames signInUrl={data?.user ? "/" : "/acceso?next=/nombres"} />
      </main>
    );
  if (path === "/acceso" || (!loading && !data))
    return (
      <Access
        error={error}
        onAuthenticated={async () => {
          // Load private data only after the new session has been verified.
          ++refreshVersion.current;
          const authenticated = await api("/api/data");
          ++refreshVersion.current;
          setSelected("");
          setData(authenticated);
          setError("");
          setLoading(false);
          router.replace(
            new URLSearchParams(window.location.search).get("next") ===
              "/nombres"
              ? "/nombres"
              : "/",
          );
        }}
      />
    );
  if (loading)
    return (
      <main className="loading">
        <Logo />
        <p>Preparando tu espacio…</p>
      </main>
    );
  if (path === "/admin")
    return (
      <main className="administration">
        <Logo />
        {["ADMIN", "EDITOR", "REVIEWER"].includes(data?.user.role) ? (
          <Admin />
        ) : (
          <Empty
            title="Acceso restringido"
            text="Esta sección requiere permisos administrativos."
          />
        )}
        <Link href="/">Volver a mi espacio</Link>
      </main>
    );
  if (!data?.pregnancy && path === "/familia")
    return <AcceptInvitation save={save} error={error} />;
  if (!data?.pregnancy)
    return <Onboarding save={save} error={error} name={data?.user.name} />;
  const title =
    path === "/"
      ? "Tu pequeño gran comienzo"
      : [...sections, ...extra, ...toolLinks].find((s) => s[0] === path)?.[1] ||
        "Administración";
  return (
    <div className="app">
      <aside>
        <Logo />
        <p className="tagline">
          Creciendo juntos,
          <br />
          desde el comienzo.
        </p>
        <nav>
          {sections.map(([url, label, Icon]) => (
            <Link className={path === url ? "active" : ""} href={url} key={url}>
              <Icon size={21} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-divider" />
        <nav>
          {extra.map(([url, label, Icon]) => (
            <Link className={path === url ? "active" : ""} href={url} key={url}>
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <Heart size={22} />
          <strong>Un día a la vez.</strong>
          <p>Cada historia tiene su propio ritmo.</p>
        </div>
        <button
          className="text-button"
          onClick={async () => {
            try {
              await clearLocalContractions();
              await signOut({ callbackUrl: "/acceso" });
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <LogOut size={17} /> Cerrar sesión
        </button>
      </aside>
      <div className="main-wrap">
        <header>
          <div className="mobile-logo">
            <Logo />
          </div>
          <span className="header-note">
            <span className="status-dot" /> Un espacio para vos y tu bebé
          </span>
          <div className="header-actions">
            <Link aria-label="Notificaciones" href="/notificaciones">
              <Bell size={21} />
            </Link>
            <Link className="avatar" href="/configuracion">
              {data.user.name.slice(0, 1)}
            </Link>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">TU EMBARAZO, CON AMOR</p>
              <h1>{title}</h1>
              <p>
                {path === "/"
                  ? `¡Hola, ${data.user.name}! Qué lindo acompañarte en esta etapa.`
                  : "Cada paso, cada recuerdo, en un mismo lugar."}
              </p>
            </div>
            <select
              aria-label="Seleccionar embarazo"
              value={data.pregnancy.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {data.pregnancies.map((p: Row) => (
                <option key={p.id} value={p.id}>
                  {p.babyName || "Mi embarazo"}
                  {p.archived ? " · Histórico" : ""}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {path === "/" ? (
            <Dashboard data={data} />
          ) : path === "/herramientas" ? (
            <ToolsHub pregnancyId={data.pregnancy.id} />
          ) : path === "/preparativos" ? (
            <Preparations
              key={data.pregnancy.id}
              pregnancyId={data.pregnancy.id}
            />
          ) : path === "/preguntas" ? (
            <Questions
              key={data.pregnancy.id}
              pregnancyId={data.pregnancy.id}
              userId={data.user.id}
            />
          ) : path === "/nombres" ? (
            <BabyNames
              key={data.pregnancy.id}
              pregnancyId={data.pregnancy.id}
            />
          ) : path === "/compartir" ? (
            <ShareCards
              key={data.pregnancy.id}
              pregnancyId={data.pregnancy.id}
              userId={data.user.id}
            />
          ) : path === "/pancita/evolucion" ? (
            <Timelapse
              key={data.pregnancy.id}
              pregnancyId={data.pregnancy.id}
            />
          ) : path === "/contracciones" ? (
            <Contractions
              key={data.pregnancy.id}
              pregnancyId={data.pregnancy.id}
              userId={data.user.id}
            />
          ) : path === "/bebe" ? (
            <Weekly
              key={data.pregnancy.id}
              current={data.gestation.currentWeek}
              age={data.gestation}
              dueDate={data.pregnancy.dueDate.slice(0, 10)}
            />
          ) : path === "/agenda" ? (
            <Agenda
              pregnancyId={data.pregnancy.id}
              save={save}
              userId={data.user.id}
            />
          ) : ["/diario", "/salud", "/ecografias", "/pancita"].includes(
              path,
            ) ? (
            <Entries
              kind={
                (
                  {
                    "/diario": "journal",
                    "/salud": "symptom",
                    "/ecografias": "ultrasound",
                    "/pancita": "belly",
                  } as Row
                )[path]
              }
              pregnancyId={data.pregnancy.id}
              save={save}
            />
          ) : path === "/familia" ? (
            <Family data={data} save={save} />
          ) : path === "/notificaciones" ? (
            <Notifications save={save} />
          ) : path === "/configuracion" ? (
            <Preferences data={data} save={save} />
          ) : path === "/admin" ? (
            <Admin />
          ) : (
            <Empty
              title="Página no encontrada"
              text="Volvé al inicio desde el menú."
            />
          )}
          <footer>
            <span>Hecho para acompañarte, con mucho amor.</span>
            <Link href="/legal">Privacidad y términos</Link>
            {data.user.role !== "USER" && (
              <Link href="/admin">Administración</Link>
            )}
          </footer>
        </main>
      </div>
      <nav className="bottom-nav">
        {sections.map(([url, label, Icon]) => (
          <Link className={path === url ? "active" : ""} href={url} key={url}>
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
