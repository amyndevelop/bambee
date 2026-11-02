type OriginEnvironment = Record<string, string | undefined>;

function configuredOrigin(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function allowedOrigins(environment: OriginEnvironment) {
  const origins = new Set<string>();
  for (const value of [environment.NEXTAUTH_URL, environment.APP_URL]) {
    const origin = configuredOrigin(value);
    if (origin) origins.add(origin);
  }
  // These hosts come from deployment configuration, never request headers.
  for (const host of [
    environment.VERCEL_PROJECT_PRODUCTION_URL,
    environment.VERCEL_URL,
  ]) {
    if (host && /^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?$/i.test(host)) {
      const origin = configuredOrigin(`https://${host}`);
      if (origin) origins.add(origin);
    }
  }
  if (!origins.size && environment.NODE_ENV !== "production")
    origins.add("http://localhost:3000");
  return origins;
}

export function assertSameOrigin(
  request: Request,
  environment: OriginEnvironment = process.env,
) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins(environment).has(origin))
    throw new Error("ORIGIN_NOT_ALLOWED");
}
