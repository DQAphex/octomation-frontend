"use client";

import { useState } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";

import {
  createWorkspaceMember,
  DEMO_IAM_USER_ID,
} from "@/lib/api/members";
import { getWorkspace } from "@/lib/api/tenants";

interface SimulateMemberHackButtonProps {
  workspaceId: string;
}

async function resolveTenantId(workspaceId: string): Promise<string | null> {
  const stored = localStorage.getItem("current_tenant_id");
  if (stored) return stored;

  const workspace = await getWorkspace(workspaceId);
  if (workspace.ok && workspace.data.tenantId) {
    return workspace.data.tenantId;
  }

  return workspaceId;
}

export default function SimulateMemberHackButton({
  workspaceId,
}: SimulateMemberHackButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleClick() {
    setIsSubmitting(true);
    setNotice(null);

    try {
      const tenantId = await resolveTenantId(workspaceId);
      if (!tenantId) {
        setNotice({
          type: "error",
          message: "No hay un tenant activo para vincular el miembro.",
        });
        return;
      }

      const result = await createWorkspaceMember({
        userId: DEMO_IAM_USER_ID,
        tenantId,
        role: "MEMBER",
      });

      if (!result.ok) {
        setNotice({ type: "error", message: result.error });
        return;
      }

      setNotice({
        type: "success",
        message: "Miembro vinculado correctamente",
      });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo vincular el miembro",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isSubmitting || !workspaceId}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-octo-700 bg-transparent px-3 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          "🔌"
        )}
        Simular Unión de Miembro (Hack Diego)
      </button>

      {notice?.type === "success" && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <CircleCheck className="mt-0.5 size-4 shrink-0" />
          <p className="font-medium">{notice.message}</p>
        </div>
      )}

      {notice?.type === "error" && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p className="font-medium">{notice.message}</p>
        </div>
      )}
    </div>
  );
}
