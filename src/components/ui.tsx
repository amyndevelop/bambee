"use client";
import { api, type Row } from "@/lib/client";
import { Flower2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="BAMBEE · Inicio">
      <img
        className="logo-isotype"
        src="/brand/isotype.svg"
        width={38}
        height={41}
        alt=""
        aria-hidden="true"
      />
      <img
        className="logo-wordmark"
        src="/brand/wordmark.svg"
        width={145}
        height={34}
        alt="BAMBEE"
      />
    </Link>
  );
}
export function BrandIsotype({
  className = "brand-isotype",
}: {
  className?: string;
}) {
  return (
    <img
      src="/brand/isotype.svg"
      className={className}
      alt="Isotipo BAMBEE"
      width={160}
      height={170}
    />
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <Flower2 size={42} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}
export function BrandGraphic({
  slug,
  fallback,
}: {
  slug: string;
  fallback?: React.ReactNode;
}) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    api("/api/brand")
      .then((assets: Row[]) =>
        setAvailable(assets.some((a) => a.slug === slug)),
      )
      .catch(() => {});
  }, [slug]);
  return available ? (
    <img
      className="brand-graphic"
      src={"/api/brand?slug=" + slug}
      alt={slug === "logo" ? "BAMBEE" : "Mascota BAMBEE"}
    />
  ) : (
    <>{fallback}</>
  );
}
