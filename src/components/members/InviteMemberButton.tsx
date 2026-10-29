"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CircleCheck,
  LoaderCircle,
  TriangleAlert,
  UserPlus,
} from "lucide-react";

import {
  createWorkspaceInvitation,
  filterWorkspacesForSession,
  getCurrentWorkspaceId,
  listWorkspaces,
  setCurrentWorkspaceId,
  unwrapWorkspaces,
  WORKSPACE_ID_KEY,
  type ApiWorkspace,
} from "@/lib/api/tenants";

function toInviteErrorMessage(error: string): string {
  const text = error.toLowerCase();
  if (
    text.includes("no existe") ||
    text.includes("not found") ||
    text.includes("no encontrado")
  ) {
    return "El usuario no existe.";
  }
  if (
    text.includes("ya pertenece") ||
    text.includes("ya es miembro") ||
    text.includes("ya existe una invitación")
  ) {
    return "Este usuario ya es miembro o tiene una invitación pendiente.";
  }
  return error;
}

interface InviteMemberButtonProps {
  onInvited?: (invitee: { email: string; workspaceId: string }) => void;
}

export default function InviteMemberButton({
  onInvited,
}: InviteMemberButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<ApiWorkspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [email, setEmail] = useState("");
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    setIsLoadingWorkspaces(true);
    setError(null);

    void (async () => {
      try {
        const result = await listWorkspaces(controller.signal);
        if (controller.signal.aborted || result.aborted) return;
        if (!result.ok) {
          setError(result.error);
          return;
        }

        const items = filterWorkspacesForSession(
          unwrapWorkspaces(result.data),
        );
        setWorkspaces(items);
        const savedId =
          localStorage.getItem(WORKSPACE_ID_KEY) ?? getCurrentWorkspaceId();
        const preferred =
          items.find((workspace) => workspace.workspaceId === savedId) ??
          items[0];
        setWorkspaceId(preferred?.workspaceId ?? savedId ?? "");
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los workspaces",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoadingWorkspaces(false);
      }
    })();

    return () => controller.abort();
  }, [isOpen]);

  function closeModal() {
    if (isLoading) return;
    setIsOpen(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("No hay una sesión activa. Inicia sesión de nuevo.");
      return;
    }

    const currentWorkspaceId = workspaceId || getCurrentWorkspaceId();
    if (!currentWorkspaceId) {
      setError("Selecciona un workspace.");
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createWorkspaceInvitation({
        email: trimmedEmail,
        workspaceId: currentWorkspaceId,
      });

      if (!result.ok) {
        setError(toInviteErrorMessage(result.error));
        return;
      }

      setCurrentWorkspaceId(currentWorkspaceId);
      setSuccess("Invitación enviada correctamente.");
      setEmail("");
      onInvited?.({
        email: trimmedEmail,
        workspaceId: currentWorkspaceId,
      });
    } catch (err: unknown) {
      setError(
        toInviteErrorMessage(
          err instanceof Error
            ? err.message
            : "No se pudo enviar la invitación",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSuccess(null);
          setError(null);
          setIsLoadingWorkspaces(true);
          setIsOpen(true);
        }}
        disabled={isLoading}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UserPlus className="size-4" />
        Invitar Miembro
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <dialog
            open
            aria-labelledby="invite-member-title"
            className="m-0 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-octo-900 text-zinc-100 shadow-2xl shadow-black/40"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4 text-violet-400" />
                <h3
                  id="invite-member-title"
                  className="text-lg font-semibold tracking-tight"
                >
                  Invitar al Workspace
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isLoading}
                className="text-sm text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-60"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <label className="block space-y-1.5 text-sm text-zinc-400">
                Workspace
                <select
                  value={workspaceId}
                  onChange={(event) => setWorkspaceId(event.target.value)}
                  disabled={isLoading || isLoadingWorkspaces}
                  className="h-11 w-full rounded-lg border border-octo-700 bg-octo-950/70 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
                >
                  {isLoadingWorkspaces ? (
                    <option value="">Cargando workspaces...</option>
                  ) : workspaces.length === 0 ? (
                    <option value={workspaceId || ""}>
                      {workspaceId ? "Workspace actual" : "No hay workspaces"}
                    </option>
                  ) : (
                    workspaces.map((workspace) => (
                      <option
                        key={workspace.workspaceId}
                        value={workspace.workspaceId}
                      >
                        {workspace.workspaceNombre}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="block space-y-1.5 text-sm text-zinc-400">
                Correo electrónico
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@empresa.com"
                  disabled={isLoading}
                  autoComplete="email"
                  className="h-11 w-full rounded-lg border border-octo-700 bg-octo-950/70 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
                />
              </label>

              {success && (
                <p className="flex items-start gap-2 text-sm text-emerald-300">
                  <CircleCheck className="mt-0.5 size-4 shrink-0" />
                  {success}
                </p>
              )}

              {error && (
                <p className="flex items-start gap-2 text-sm text-red-400">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isLoading}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-octo-700 px-4 text-sm font-medium text-zinc-300 hover:bg-octo-800 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isLoadingWorkspaces || !workspaceId}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading && (
                    <LoaderCircle className="size-4 animate-spin" />
                  )}
                  {isLoading ? "Enviando..." : "Enviar invitación"}
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
    </>
  );
}
