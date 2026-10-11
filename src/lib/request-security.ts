export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  const allowed = new Set([`${protocol}://${host}`, process.env.NEXT_PUBLIC_APP_URL].filter(Boolean));
  return allowed.has(origin);
}
