/** Configuration presence only; never return secret values. */
export function authReadiness(
  environment: Record<string, string | undefined> = process.env,
) {
  const secret = environment.NEXTAUTH_SECRET ?? environment.AUTH_SECRET;
  return {
    sessionConfigured:
      environment.NODE_ENV !== "production" || Boolean(secret?.trim()),
  };
}
