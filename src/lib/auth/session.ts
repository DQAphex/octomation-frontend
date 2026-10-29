export interface SessionUser {
  id?: string;
  email?: string;
  role?: string;
  fullName?: string;
  full_name?: string;
}

export function decodeJwtPayload(token: string): SessionUser | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;

    const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as SessionUser;
  } catch {
    return null;
  }
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token) return null;
  return decodeJwtPayload(token);
}

export function getSessionDisplayName(user: SessionUser | null): string {
  if (!user) return "ahí";
  return user.full_name || user.fullName || user.email || "ahí";
}
