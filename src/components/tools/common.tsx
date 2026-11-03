"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type Row } from "@/lib/client";
export function useTool(module: string, pregnancyId: string) {
  const [data, setData] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setData(
        await api(
          `/api/tools?module=${module}&pregnancyId=${encodeURIComponent(pregnancyId)}`,
        ),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [module, pregnancyId]);
  useEffect(() => {
    setData(null);
    setLoading(true);
    void load();
  }, [load]);
  const act = async (op: string, values: unknown) => {
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/tools", {
        module,
        pregnancyId,
        op,
        data: values,
      });
      await load();
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { data, error, busy, loading, load, act, setError, setData };
}
export function ToolStatus({
  error,
  loading,
}: {
  error: string;
  loading: boolean;
}) {
  return (
    <>
      {loading && <p role="status">Cargando tus datos…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const dateValue = (value: string | null | undefined) =>
  value ? value.slice(0, 10) : "";
export function dateTimeInput(value: string | undefined | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
