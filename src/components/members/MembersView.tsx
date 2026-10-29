"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Pencil, Trash2 } from "lucide-react";

import InviteMemberButton from "@/components/members/InviteMemberButton";
import {
  fetchWorkspaceMembers,
  getCurrentWorkspaceId,
  getWorkspace,
  removeMemberOrInvitation,
  setCurrentWorkspaceId,
} from "@/lib/api/tenants";
import { getInitials } from "@/lib/format";
import { useWorkspaces } from "@/lib/hooks/use-workspaces";
import { roleLabels, roleStyles } from "@/lib/roles";
import type { Member, MemberStatus } from "@/types";

const statusLabels: Record<MemberStatus, string> = {
  ACTIVE: "Activo",
  PENDING: "Pendiente",
};

const statusStyles: Record<MemberStatus, string> = {
  ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-400",
};

const statusDotStyles: Record<MemberStatus, string> = {
  ACTIVE: "bg-emerald-400",
  PENDING: "bg-amber-400",
};

function isActiveStatus(status: string): boolean {
  return status === "active" || status === "ACTIVE";
}

export default function MembersView() {
  const { currentWorkspaceId, isLoading: isLoadingWorkspaces } =
    useWorkspaces();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isLoading = isLoadingWorkspaces || isLoadingMembers;
  const pendingCount = members.filter(
    (member) => member.status === "PENDING",
  ).length;
  const workspaceId = currentWorkspaceId ?? getCurrentWorkspaceId();

  const loadMembers = useCallback(
    async (
      targetWorkspaceId: string,
      options?: { silent?: boolean; signal?: AbortSignal },
    ) => {
      if (!options?.silent) {
        setIsLoadingMembers(true);
        setError(null);
      }

      try {
        const details = await getWorkspace(
          targetWorkspaceId,
          options?.signal,
        );
        if (details.ok && details.data?.tenantId) {
          setCurrentWorkspaceId(targetWorkspaceId, {
            silent: true,
            tenantId: details.data.tenantId,
          });
        }

        const result = await fetchWorkspaceMembers(
          targetWorkspaceId,
          options?.signal,
        );

        if (options?.signal?.aborted) return;

        if (!result.ok) {
          if (result.aborted) return;
          setError(result.error);
          if (!options?.silent) setMembers([]);
          return;
        }

        setMembers(result.data);
        setError(null);
      } catch (err: unknown) {
        if (options?.signal?.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los miembros",
        );
        if (!options?.silent) setMembers([]);
      } finally {
        if (!options?.signal?.aborted) setIsLoadingMembers(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (isLoadingWorkspaces) return;

    if (!workspaceId) {
      setMembers([]);
      setIsLoadingMembers(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    void loadMembers(workspaceId, { signal: controller.signal });
    return () => controller.abort();
  }, [workspaceId, isLoadingWorkspaces, loadMembers]);

  function handleInvited(invitee: { email: string; workspaceId: string }) {
    setMembers((current) => {
      const alreadyListed = current.some(
        (member) =>
          member.email.toLowerCase() === invitee.email.toLowerCase(),
      );
      if (alreadyListed) return current;
      return [
        ...current,
        {
          id: `pending-${invitee.email}`,
          name: invitee.email.split("@")[0] || "Invitado",
          email: invitee.email,
          role: "MEMBER",
          status: "PENDING",
        },
      ];
    });

    void loadMembers(invitee.workspaceId, { silent: true });
  }

  async function handleRemoveMember(member: Member) {
    if (!workspaceId || deletingId) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setActionError("No hay una sesión activa. Inicia sesión de nuevo.");
      return;
    }

    setDeletingId(member.id);
    setActionError(null);

    try {
      const result = await removeMemberOrInvitation(member, workspaceId);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }

      setMembers((current) =>
        current.filter((item) => item.id !== member.id),
      );
      void loadMembers(workspaceId, { silent: true });
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el registro",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Miembros del Equipo
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Invita personas a tu workspace y administra su rol y acceso.
          </p>
        </div>
        <InviteMemberButton onInvited={handleInvited} />
      </header>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-octo-900/60 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-sm font-medium text-zinc-100">
            {isLoading ? "Miembros" : `${members.length} miembros`}
          </h3>
          <p className={`text-xs ${actionError ? "text-red-400" : "text-zinc-500"}`}>
            {actionError
              ? actionError
              : isLoading
                ? "Cargando..."
                : `${pendingCount} ${
                    pendingCount === 1
                      ? "invitación pendiente"
                      : "invitaciones pendientes"
                  }`}
          </p>
        </div>

        {isLoading ? (
          <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-zinc-400">
            <LoaderCircle className="size-5 animate-spin text-violet-400" />
            Cargando miembros...
          </div>
        ) : error ? (
          <div className="px-6 py-10 text-center text-sm text-red-400">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-zinc-500">
                  <th scope="col" className="px-6 py-3 font-medium">
                    Usuario
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">
                    Rol
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-right font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-octo-800/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-fuchsia-500 text-xs font-semibold text-white">
                          {getInitials(member.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-100">
                            {member.name}
                          </p>
                          <p className="truncate text-xs text-zinc-500">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleStyles[member.role]}`}
                      >
                        {roleLabels[member.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          isActiveStatus(member.status)
                            ? statusStyles.ACTIVE
                            : statusStyles.PENDING
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            isActiveStatus(member.status)
                              ? statusDotStyles.ACTIVE
                              : statusDotStyles.PENDING
                          }`}
                        />
                        {isActiveStatus(member.status)
                          ? statusLabels.ACTIVE
                          : statusLabels.PENDING}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Editar a ${member.name}`}
                          className="flex size-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-octo-800 hover:text-violet-300"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar a ${member.name}`}
                          onClick={() => void handleRemoveMember(member)}
                          disabled={deletingId === member.id}
                          className="flex size-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
