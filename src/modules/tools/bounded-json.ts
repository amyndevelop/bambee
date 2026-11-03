export async function boundedJson(request: Request, maximum = 100000) {
  if (Number(request.headers.get("content-length") || 0) > maximum)
    throw new Error("Solicitud demasiado grande");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Solicitud vacía");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > maximum) {
      await reader.cancel();
      throw new Error("Solicitud demasiado grande");
    }
    chunks.push(part.value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
