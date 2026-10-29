"use client";

import { useCallback, useEffect, useState } from "react";

import {
  filterWorkspacesForSession,
  listWorkspaces,
  setCurrentWorkspaceId as persistWorkspaceId,
  unwrapWorkspaces,
  WORKSPACE_CHANGED_EVENT,
  WORKSPACE_ID_KEY,
  type ApiWorkspace,
} from "@/lib/api/tenants";
import type { Workspace } from "@/types";

function toSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toWorkspace(item: ApiWorkspace): Workspace {
  return {
    id: item.workspaceId,
    name: item.workspaceNombre,
    slug: toSlug(item.workspaceNombre),
    planId: "",
    role: "MEMBER",
  };
}

export function useWorkspaces() {
  const [items, setItems] = useState<ApiWorkspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const result = await listWorkspaces(signal);
    if (signal?.aborted || result.aborted) return;

    if (!result.ok) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    const scoped = filterWorkspacesForSession(unwrapWorkspaces(result.data));
    setItems(scoped);

    const savedId = localStorage.getItem(WORKSPACE_ID_KEY);
    const preferred =
      scoped.find((workspace) => workspace.workspaceId === savedId) ??
      scoped[0];

    if (preferred) {
      persistWorkspaceId(preferred.workspaceId, {
        silent: true,
        tenantId: preferred.tenantId,
      });
      setCurrentWorkspaceId(preferred.workspaceId);
    } else {
      setCurrentWorkspaceId(null);
    }

    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);

    function onChanged(event: Event) {
      const id = (event as CustomEvent<string>).detail;
      if (typeof id === "string" && id.length > 0) {
        setCurrentWorkspaceId(id);
      }
    }

    window.addEventListener(WORKSPACE_CHANGED_EVENT, onChanged);
    return () => {
      controller.abort();
      window.removeEventListener(WORKSPACE_CHANGED_EVENT, onChanged);
    };
  }, [refresh]);

  function selectWorkspace(workspaceId: string) {
    const match = items.find((item) => item.workspaceId === workspaceId);
    persistWorkspaceId(workspaceId, { tenantId: match?.tenantId });
    setCurrentWorkspaceId(workspaceId);
  }

  const workspaces = items.map(toWorkspace);
  const currentWorkspace =
    workspaces.find((workspace) => workspace.id === currentWorkspaceId) ??
    null;

  return {
    workspaces,
    apiWorkspaces: items,
    currentWorkspaceId,
    currentWorkspace,
    selectWorkspace,
    isLoading,
    error,
    refresh,
  };
}
