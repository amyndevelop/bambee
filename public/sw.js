/* Cache only public application code and the timer's generic, unauthenticated HTML shell.
   API responses, photographs, exports and personal data are never cached here. */
const CACHE = "bambee-public-timer-shell-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
async function warmTimer() {
  const cache = await caches.open(CACHE),
    response = await fetch("/contracciones", { cache: "no-store" });
  if (!response.ok) return;
  const html = await response.clone().text();
  await cache.put("/contracciones", response);
  const paths = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"<>]+)"/g)].map(
        (match) => match[1].replaceAll("&amp;", "&"),
      ),
    ),
  ];
  await Promise.all(
    paths.slice(0, 80).map(async (path) => {
      const r = await fetch(path);
      if (r.ok) await cache.put(path, r);
    }),
  );
}
self.addEventListener("message", (event) => {
  if (event.data?.type === "BAMBEE_WARM_TIMER")
    event.waitUntil(
      warmTimer()
        .then(() => event.ports?.[0]?.postMessage({ ready: true }))
        .catch(() => {}),
    );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET")
    return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE),
          existing = await cache.match(event.request);
        if (existing) return existing;
        const r = await fetch(event.request);
        if (r.ok) await cache.put(event.request, r.clone());
        return r;
      })(),
    );
  } else if (
    event.request.mode === "navigate" &&
    url.pathname === "/contracciones" &&
    !url.search
  ) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const shell = await (await caches.open(CACHE)).match("/contracciones");
        return (
          shell ||
          new Response(
            "Conectate una vez a BAMBEE para preparar el cronómetro sin conexión.",
            {
              status: 503,
              headers: { "Content-Type": "text/plain;charset=utf-8" },
            },
          )
        );
      }),
    );
  }
});
