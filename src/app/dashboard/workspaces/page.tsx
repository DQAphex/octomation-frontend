"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Building2,
  ChevronRight,
  LoaderCircle,
  Plus,
  Puzzle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { roleLabels, roleStyles } from "@/lib/roles";
import type { Workspace } from "@/types";

const TENANTS_URL =
  process.env.NEXT_PUBLIC_TENANTS_URL ?? "http://localhost:4004";

const PLACEHOLDER_UUID = "00000000-0000-0000-0000-000000000000";

interface ApiWorkspace {
  workspaceId: string;
  tenantId: string;
  workspaceNombre: string;
  maxMemberLimitId: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

type WorkspacesResponse = { data: ApiWorkspace[] } | ApiWorkspace[];

type WorkspaceCard = Workspace & { plugins: number };

function toSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// La API todavía no expone el rol del usuario ni la cantidad de plugins.
function toWorkspaceCard(workspace: ApiWorkspace): WorkspaceCard {
  return {
    id: workspace.workspaceId,
    name: workspace.workspaceNombre,
    slug: toSlug(workspace.workspaceNombre),
    planId: "",
    role: "MEMBER",
    plugins: 0,
  };
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function loadWorkspaces(signal?: AbortSignal) {
    const res = await fetch(`${TENANTS_URL}/workspaces?page=1&limit=10`, {
      signal,
    });
    if (!res.ok) throw new Error(`Error ${res.status} al cargar workspaces`);
    const body = (await res.json()) as WorkspacesResponse;
    const items = Array.isArray(body) ? body : body.data;
    setWorkspaces(items.map(toWorkspaceCard));
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

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await fetch(`${TENANTS_URL}/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: PLACEHOLDER_UUID,
          workspaceNombre: name,
          maxMemberLimitId: PLACEHOLDER_UUID,
        }),
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status} al crear el workspace`);
      }

      const created = (await res.json()) as ApiWorkspace;
      setWorkspaces((current) => [toWorkspaceCard(created), ...current]);
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

    loadWorkspaces(controller.signal)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los workspaces",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
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
        <button
          type="button"
          onClick={openModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500"
        >
          <Plus className="size-4" />
          Crear nuevo Workspace
        </button>
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

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-zinc-400">
                  <Puzzle className="size-4" />
                  {workspace.plugins}{" "}
                  {workspace.plugins === 1 ? "plugin" : "plugins"}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-violet-400 transition-colors group-hover:text-violet-300">
                  Abrir
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
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
