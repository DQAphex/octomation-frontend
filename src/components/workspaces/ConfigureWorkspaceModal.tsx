"use client";

import { useState } from "react";
import { LoaderCircle, Settings2, TriangleAlert } from "lucide-react";

import { deleteWorkspace, WORKSPACE_ID_KEY } from "@/lib/api/tenants";

interface ConfigureWorkspaceModalProps {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  onClose: () => void;
  onDeleted: (workspaceId: string) => void;
}

export default function ConfigureWorkspaceModal({
  workspaceId,
  workspaceName,
  workspaceSlug,
  onClose,
  onDeleted,
}: ConfigureWorkspaceModalProps) {
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteWorkspace(workspaceId);
      if (!result.ok) {
        setError(result.error);
        setIsDeleting(false);
        return;
      }

      if (localStorage.getItem(WORKSPACE_ID_KEY) === workspaceId) {
        localStorage.removeItem(WORKSPACE_ID_KEY);
      }

      onDeleted(workspaceId);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el workspace",
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <dialog
        open
        aria-labelledby="configure-workspace-title"
        className="m-0 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-octo-900 text-zinc-100 shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-violet-400" />
            <h3
              id="configure-workspace-title"
              className="text-lg font-semibold tracking-tight"
            >
              Configuración del Workspace
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-60"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <p className="text-base font-medium text-zinc-100">
              {workspaceName}
            </p>
            <p className="mt-0.5 font-mono text-xs text-zinc-500">
              /{workspaceSlug}
            </p>
          </div>

          <section className="rounded-xl border border-red-500/40 bg-red-500/5 p-4">
            <h4 className="text-sm font-semibold text-red-400">
              Zona de Peligro
            </h4>
            <p className="mt-1 text-sm text-zinc-400">
              Eliminar el workspace lo quita de forma permanente. Los plugins
              instalados dejarán de estar asociados a este espacio.
            </p>

            {confirming && (
              <p className="mt-3 text-sm font-medium text-red-300">
                ¿Estás seguro de eliminar este workspace? Esta acción es
                irreversible.
              </p>
            )}

            {error && (
              <p className="mt-3 flex items-start gap-2 text-sm text-red-400">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {confirming && (
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={isDeleting}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-octo-700 px-3 text-sm font-medium text-zinc-300 hover:bg-octo-800 disabled:opacity-60"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting && <LoaderCircle className="size-4 animate-spin" />}
                {isDeleting
                  ? "Eliminando..."
                  : confirming
                    ? "Sí, eliminar"
                    : "Eliminar Workspace"}
              </button>
            </div>
          </section>
        </div>
      </dialog>
    </div>
  );
}
