"use client";
import { api, type Row } from "@/lib/client";
import { Flower2, Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
export function Logo() {
  return (
    <Link href="/" className="logo">
      <BrandGraphic
        slug="logo"
        fallback={
          <>
            <span className="logo-mark">
              b<Heart size={13} />
            </span>
            bambee<span className="logo-dot">♥</span>
          </>
        }
      />
    </Link>
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
