import { safeFetchJson } from "@/lib/api/safe-fetch";

export const TENANTS_URL =
  process.env.NEXT_PUBLIC_TENANTS_URL ?? "http://localhost:4004";

export const WORKSPACE_ID_KEY = "current_workspace_id";

export interface ApiWorkspace {
  workspaceId: string;
  tenantId: string;
  workspaceNombre: string;
  maxMemberLimitId: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export async function listWorkspaces(signal?: AbortSignal) {
  return safeFetchJson<ApiWorkspace[] | { data: ApiWorkspace[] }>(
    `${TENANTS_URL}/workspaces?page=1&limit=50`,
    { signal },
  );
}

export function unwrapWorkspaces(
  body: ApiWorkspace[] | { data: ApiWorkspace[] } | undefined,
): ApiWorkspace[] {
  if (!body) return [];
  return Array.isArray(body) ? body : body.data ?? [];
}

export async function getWorkspace(workspaceId: string) {
  return safeFetchJson<ApiWorkspace>(
    `${TENANTS_URL}/workspaces/${workspaceId}`,
  );
}

export async function deleteWorkspace(workspaceId: string) {
  return safeFetchJson<{ message?: string }>(
    `${TENANTS_URL}/workspaces/${workspaceId}`,
    { method: "DELETE" },
  );
}
