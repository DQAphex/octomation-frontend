"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  LoaderCircle,
  Plus,
  Puzzle,
  Settings2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import CreatePluginModal from "@/components/plugins/CreatePluginModal";
import ConfigureWorkspaceModal from "@/components/workspaces/ConfigureWorkspaceModal";
import { countWorkspacePlugins } from "@/lib/api/plugins";
import { safeFetchJson } from "@/lib/api/safe-fetch";
import {
  filterWorkspacesForSession,
  getSessionAuthHeaders,
  listWorkspaces,
  setCurrentWorkspaceId,
  TENANTS_URL,
  TENANT_ID_KEY,
  unwrapWorkspaces,
  type ApiWorkspace,
} from "@/lib/api/tenants";
import { roleLabels, roleStyles } from "@/lib/roles";
import type { Workspace } from "@/types";

const PLACEHOLDER_UUID = "00000000-0000-0000-0000-000000000000";

type WorkspaceCard = Workspace & { plugins: number | null; tenantId: string };

function toSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toWorkspaceCard(workspace: ApiWorkspace): WorkspaceCard {
  return {
    id: workspace.workspaceId,
    name: workspace.workspaceNombre,
    slug: toSlug(workspace.workspaceNombre),
    planId: "",
    role: "MEMBER",
    plugins: null,
    tenantId: workspace.tenantId,
  };
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [workspaceToConfigure, setWorkspaceToConfigure] =
    useState<WorkspaceCard | null>(null);

  async function loadPluginCounts(
    cards: WorkspaceCard[],
    signal?: AbortSignal,
  ) {
    const counted = await Promise.all(
      cards.map(async (card) => ({
        id: card.id,
        plugins: await countWorkspacePlugins(card.id, signal),
      })),
    );

    if (signal?.aborted) return;

    setWorkspaces((current) =>
      current.map((card) => {
        const match = counted.find((item) => item.id === card.id);
        return match ? { ...card, plugins: match.plugins } : card;
      }),
    );
  }

  async function loadWorkspaces(signal?: AbortSignal) {
    try {
      const result = await listWorkspaces(signal);

      if (result.aborted) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const items = filterWorkspacesForSession(unwrapWorkspaces(result.data));
      const cards = items.map(toWorkspaceCard);
      setWorkspaces(cards);
      setError(null);
      await loadPluginCounts(cards, signal);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los workspaces",
      );
    }
  }

  function openPluginModal() {
    setIsPluginModalOpen(true);
  }

  function openModal() {
    setWorkspaceName("");
    setCreateError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isCreating) return;
    setIsModalOpen(false);
    setCreateError(null);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name) {
      setCreateError("Ingresa un nombre para el workspace.");
      return;
    }

    const tenantId = localStorage.getItem(TENANT_ID_KEY);
    if (!tenantId) {
      setCreateError("No hay una empresa activa seleccionada");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const result = await safeFetchJson<ApiWorkspace>(
        `${TENANTS_URL}/workspaces`,
        {
          method: "POST",
          headers: getSessionAuthHeaders(),
          body: JSON.stringify({
            tenantId,
            workspaceNombre: name,
            maxMemberLimitId: PLACEHOLDER_UUID,
          }),
        },
      );

      if (!result.ok) {
        setCreateError(result.error);
        return;
      }

      setWorkspaces((current) => [
        { ...toWorkspaceCard(result.data), plugins: 0 },
        ...current,
      ]);
      setIsModalOpen(false);
      setWorkspaceName("");
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el workspace",
      );
    } finally {
      setIsCreating(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    void (async () => {
      try {
        await loadWorkspaces(controller.signal);
      } catch (err: unknown) {
        if (cancelled || controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los workspaces",
        );
      } finally {
        if (!cancelled && !controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Mis Workspaces
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Espacios de trabajo a los que perteneces y tu rol en cada uno.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openPluginModal}
            className="relative z-20 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-octo-700 px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-violet-500/50 hover:text-violet-300"
          >
            <Puzzle className="size-4" />
            Crear plugin
          </button>
          <button
            type="button"
            onClick={openModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500"
          >
            <Plus className="size-4" />
            Crear nuevo Workspace
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex min-h-56 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-octo-900/40 text-sm text-zinc-400">
          <LoaderCircle className="size-5 animate-spin text-violet-400" />
          Cargando workspaces...
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">No se pudieron cargar los workspaces.</p>
            <p className="mt-1 text-red-300/80">
              {error}. Verifica que el servicio de Tenants esté corriendo en{" "}
              <span className="font-mono">{TENANTS_URL}</span>.
            </p>
          </div>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <article
              key={workspace.id}
              className="group relative flex flex-col rounded-2xl border border-white/10 bg-octo-900/60 p-6 shadow-xl shadow-black/20 backdrop-blur-xl transition-colors hover:border-violet-500/40"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/30">
                  <Building2 className="size-6" />
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleStyles[workspace.role]}`}
                >
                  <ShieldCheck className="size-3" />
                  {roleLabels[workspace.role]}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-semibold text-zinc-100">
                {workspace.name}
              </h3>
              <p className="font-mono text-xs text-zinc-500">
                /{workspace.slug}
              </p>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-zinc-400">
                  {workspace.plugins === null ? (
                    <LoaderCircle className="size-4 animate-spin text-violet-400" />
                  ) : (
                    <Puzzle className="size-4" />
                  )}
                  {workspace.plugins === null
                    ? "Contando..."
                    : `${workspace.plugins} ${workspace.plugins === 1 ? "plugin" : "plugins"}`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWorkspaceToConfigure(workspace)}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-octo-700 px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-violet-500/50 hover:text-violet-300"
                  >
                    <Settings2 className="size-3.5" />
                    Configurar
                  </button>
                  <Link
                    href={`/dashboard/workspaces/${workspace.id}/plugins`}
                    onClick={() =>
                      setCurrentWorkspaceId(workspace.id, {
                        tenantId: workspace.tenantId,
                      })
                    }
                    className="inline-flex items-center gap-1 font-medium text-violet-400 transition-colors hover:text-violet-300"
                  >
                    Abrir
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}

          <button
            type="button"
            onClick={openModal}
            className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-octo-700 text-zinc-400 transition-colors hover:border-violet-500/50 hover:bg-octo-900/40 hover:text-violet-300"
          >
            <span className="flex size-12 items-center justify-center rounded-xl border border-octo-700">
              <Plus className="size-6" />
            </span>
            <span className="text-sm font-medium">
              {workspaces.length === 0
                ? "Aún no tienes workspaces. Crea el primero"
                : "Crear nuevo Workspace"}
            </span>
          </button>
        </section>
      )}

      {isPluginModalOpen && (
        <CreatePluginModal onClose={() => setIsPluginModalOpen(false)} />
      )}

      {workspaceToConfigure && (
        <ConfigureWorkspaceModal
          workspaceId={workspaceToConfigure.id}
          workspaceName={workspaceToConfigure.name}
          workspaceSlug={workspaceToConfigure.slug}
          onClose={() => setWorkspaceToConfigure(null)}
          onDeleted={(workspaceId) =>
            setWorkspaces((current) =>
              current.filter((workspace) => workspace.id !== workspaceId),
            )
          }
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <dialog
            open
            aria-labelledby="create-workspace-title"
            className="m-0 w-full max-w-md rounded-2xl border border-white/10 bg-octo-900 p-6 text-zinc-100 shadow-2xl shadow-black/40"
          >
            <h3
              id="create-workspace-title"
              className="text-lg font-semibold tracking-tight"
            >
              Crear nuevo Workspace
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Dale un nombre a tu espacio de trabajo para empezar.
            </p>

            <form onSubmit={handleCreate} className="mt-6 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-zinc-300">
                  Nombre del Workspace
                </span>
                <input
                  autoFocus
                  type="text"
                  name="workspaceNombre"
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="Acme Corp"
                  maxLength={100}
                  disabled={isCreating}
                  className="h-11 w-full rounded-lg border border-octo-700 bg-octo-950/70 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
                />
              </label>

              {createError && (
                <p className="text-sm text-red-400">{createError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isCreating}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-octo-700 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-octo-800 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreating && (
                    <LoaderCircle className="size-4 animate-spin" />
                  )}
                  {isCreating ? "Creando..." : "Crear"}
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
    </div>
  );
}
