import { safeFetchJson } from "@/lib/api/safe-fetch";

export const PLUGINS_URL =
  process.env.NEXT_PUBLIC_PLUGINS_URL ?? "http://localhost:4005";

export interface GithubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string;
  created_at?: string;
}

export interface CreatePluginPayload {
  name: string;
  pluginCategory: "General";
  author: string;
  email: string;
  repositoryUrl: string;
  latestVersion: string;
  releaseTag: string;
  pluginCreatedAt: string;
}

export function normalizeVersionParts(tagName: string): {
  latestVersion: string;
  releaseTag: string;
} {
  const cleaned = tagName.trim().replace(/^v/i, "");
  return {
    latestVersion: cleaned,
    releaseTag: `v${cleaned}`,
  };
}

export interface ApiPlugin {
  pluginId?: string;
  id?: string;
  name: string;
  author: string;
  pluginCategory?: string;
  category?: string;
  latestVersion?: string;
  version?: string;
  repositoryUrl?: string;
}

export function toCatalogPlugin(plugin: ApiPlugin) {
  return {
    id: plugin.pluginId ?? plugin.id ?? plugin.repositoryUrl ?? plugin.name,
    name: plugin.name,
    author: plugin.author,
    description: plugin.repositoryUrl ?? "Sin descripción",
    category: plugin.pluginCategory ?? plugin.category ?? "General",
    version: plugin.latestVersion ?? plugin.version ?? "",
  };
}

export function isDuplicateRepositoryError(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes("23505") ||
    text.includes("unique") ||
    text.includes("duplicate") ||
    text.includes("plugins_repository_url") ||
    text.includes("repository_url")
  );
}

export async function listPlugins() {
  return safeFetchJson<ApiPlugin[] | { data: ApiPlugin[] }>(
    `${PLUGINS_URL}/plugins`,
  );
}

export interface ApiWorkspacePlugin {
  workspacePluginId?: string;
  workspaceId?: string;
  pluginId: string;
  installedAt?: string;
  name?: string;
  author?: string;
  pluginCategory?: string;
  latestVersion?: string;
  repositoryUrl?: string;
}

export function unwrapList<T>(body: T[] | { data: T[] } | undefined): T[] {
  if (!body) return [];
  return Array.isArray(body) ? body : body.data ?? [];
}

export function toInstalledPlugin(
  row: ApiWorkspacePlugin,
  catalog?: ApiPlugin,
) {
  const pluginId = row.pluginId;
  const source: ApiPlugin = {
    pluginId,
    name: row.name ?? catalog?.name ?? "Plugin",
    author: row.author ?? catalog?.author ?? "Desconocido",
    pluginCategory:
      row.pluginCategory ?? catalog?.pluginCategory ?? catalog?.category,
    latestVersion:
      row.latestVersion ?? catalog?.latestVersion ?? catalog?.version,
    repositoryUrl: row.repositoryUrl ?? catalog?.repositoryUrl,
  };
  return toCatalogPlugin(source);
}

export async function listWorkspacePlugins(
  workspaceId: string,
  signal?: AbortSignal,
) {
  return safeFetchJson<ApiWorkspacePlugin[] | { data: ApiWorkspacePlugin[] }>(
    `${PLUGINS_URL}/workspaces/${workspaceId}/plugins`,
    { signal },
  );
}

export async function countWorkspacePlugins(
  workspaceId: string,
  signal?: AbortSignal,
) {
  const result = await listWorkspacePlugins(workspaceId, signal);
  if (!result.ok) return 0;
  return unwrapList(result.data).length;
}

export async function fetchGithubReleases(repositoryUrl: string) {
  return safeFetchJson<GithubRelease[] | { data: GithubRelease[] }>(
    `${PLUGINS_URL}/plugins/github/releases`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repositoryUrl }),
    },
  );
}

export async function createPlugin(payload: CreatePluginPayload) {
  return safeFetchJson<unknown>(`${PLUGINS_URL}/plugins/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function isAlreadyInstalledError(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes("23505") ||
    text.includes("unique") ||
    text.includes("duplicate") ||
    text.includes("conflict") ||
    text.includes("409") ||
    text.includes("workspace_plugins_unique") ||
    text.includes("already installed") ||
    text.includes("ya está instalado")
  );
}

export async function installWorkspacePlugin(
  workspaceId: string,
  pluginId: string,
) {
  return safeFetchJson<ApiWorkspacePlugin>(
    `${PLUGINS_URL}/workspaces/${workspaceId}/plugins`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, pluginId }),
    },
  );
}

export async function uninstallWorkspacePlugin(
  workspaceId: string,
  pluginId: string,
) {
  return safeFetchJson<{ message?: string }>(
    `${PLUGINS_URL}/workspaces/${workspaceId}/plugins/${pluginId}`,
    { method: "DELETE" },
  );
}
