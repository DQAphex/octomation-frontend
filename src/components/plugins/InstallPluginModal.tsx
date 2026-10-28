"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { LoaderCircle, Puzzle, TriangleAlert } from "lucide-react";

import {
  installWorkspacePlugin,
  isAlreadyInstalledError,
} from "@/lib/api/plugins";
import {
  listWorkspaces,
  unwrapWorkspaces,
  WORKSPACE_ID_KEY,
  type ApiWorkspace,
} from "@/lib/api/tenants";
import type { CatalogPlugin } from "@/types";

interface InstallPluginModalProps {
  plugin: CatalogPlugin;
  onClose: () => void;
  onInstalled: (workspaceName: string) => void;
}

function toInstallErrorMessage(error: string): string {
  if (isAlreadyInstalledError(error)) {
    return "Este plugin ya está instalado en el workspace seleccionado.";
  }
  if (/internal server error/i.test(error)) {
    return "No se pudo instalar el plugin. Si ya está en este workspace, no hace falta volver a instalarlo.";
  }
  return error;
}

export default function InstallPluginModal({
  plugin,
  onClose,
  onInstalled,
}: InstallPluginModalProps) {
  const [workspaces, setWorkspaces] = useState<ApiWorkspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const result = await listWorkspaces(controller.signal);
        if (controller.signal.aborted) return;

        if (!result.ok) {
          if (result.aborted) return;
          setError(result.error);
          return;
        }

        const items = unwrapWorkspaces(result.data);
        setWorkspaces(items);

        const savedId = localStorage.getItem(WORKSPACE_ID_KEY);
        const preferred =
          items.find((workspace) => workspace.workspaceId === savedId) ??
          items[0];
        setWorkspaceId(preferred?.workspaceId ?? "");
        setError(null);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los workspaces",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId) {
      setError("Selecciona un workspace para instalar el plugin.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await installWorkspacePlugin(workspaceId, plugin.id);
      if (!result.ok) {
        setError(toInstallErrorMessage(result.error));
        return;
      }

      localStorage.setItem(WORKSPACE_ID_KEY, workspaceId);
      const selected = workspaces.find(
        (workspace) => workspace.workspaceId === workspaceId,
      );
      onInstalled(selected?.workspaceNombre ?? "el workspace");
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo instalar el plugin en el workspace",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <dialog
        open
        aria-labelledby="install-plugin-title"
        className="m-0 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-octo-900 text-zinc-100 shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Puzzle className="size-4 text-violet-400" />
            <h3
              id="install-plugin-title"
              className="text-lg font-semibold tracking-tight"
            >
              Agregar al Workspace
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-60"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <p className="text-base font-medium text-zinc-100">{plugin.name}</p>
            <p className="mt-0.5 text-sm text-zinc-400">
              {plugin.author} · v{plugin.version.replace(/^v/i, "")}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <LoaderCircle className="size-4 animate-spin text-violet-400" />
              Cargando workspaces...
            </div>
          ) : workspaces.length === 0 && !error ? (
            <p className="text-sm text-zinc-400">
              Todavía no tienes workspaces.{" "}
              <Link
                href="/dashboard/workspaces"
                className="text-violet-300 underline-offset-2 hover:underline"
              >
                Crea uno primero
              </Link>{" "}
              para instalar plugins.
            </p>
          ) : (
            <label className="block space-y-1.5 text-sm text-zinc-400">
              Workspace de destino
              <select
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.target.value)}
                disabled={isSubmitting || workspaces.length === 0}
                className="h-11 w-full rounded-lg border border-octo-700 bg-octo-950/70 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
              >
                {workspaces.map((workspace) => (
                  <option
                    key={workspace.workspaceId}
                    value={workspace.workspaceId}
                  >
                    {workspace.workspaceNombre}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && (
            <p className="flex items-start gap-2 text-sm text-red-400">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-octo-700 px-4 text-sm font-medium text-zinc-300 hover:bg-octo-800 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading || !workspaceId}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
              {isSubmitting ? "Instalando..." : "Instalar"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
