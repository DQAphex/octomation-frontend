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
