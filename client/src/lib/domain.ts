// Routes that should be unreachable when the app is loaded on zackerz.world.
// Paths are hash-based (e.g. "#/login"), so this must be checked client-side —
// a Vercel Edge Middleware would never see the path since hash fragments
// aren't sent to the server.
export const AUTH_ROUTES = ["/login", "/admin"];

export function isWorldDomain(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.includes("zackerz.world");
}

export function isBlockedOnWorldDomain(path: string): boolean {
  return AUTH_ROUTES.some((route) => path.startsWith(route));
}
