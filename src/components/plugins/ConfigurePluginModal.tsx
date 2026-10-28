"use client";

import { useState } from "react";
import { LoaderCircle, Settings2, TriangleAlert } from "lucide-react";

import { uninstallWorkspacePlugin } from "@/lib/api/plugins";
import type { CatalogPlugin } from "@/types";

interface ConfigurePluginModalProps {
  workspaceId: string;
  plugin: CatalogPlugin;
  onClose: () => void;
  onUninstalled: (pluginId: string) => void;
}

export default function ConfigurePluginModal({
  workspaceId,
  plugin,
  onClose,
  onUninstalled,
}: ConfigurePluginModalProps) {
  const [confirming, setConfirming] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUninstall() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setIsUninstalling(true);
    setError(null);

    try {
      const result = await uninstallWorkspacePlugin(workspaceId, plugin.id);
      if (!result.ok) {
        setError(result.error);
        setIsUninstalling(false);
        return;
      }
      onUninstalled(plugin.id);
      onClose();
    } catch (err: unknown) {
      console.error("Error al desinstalar plugin:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo desinstalar el plugin",
      );
      setIsUninstalling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <dialog
        open
        aria-labelledby="configure-plugin-title"
        className="m-0 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-octo-900 text-zinc-100 shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-violet-400" />
            <h3
              id="configure-plugin-title"
              className="text-lg font-semibold tracking-tight"
            >
              Configurar plugin
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUninstalling}
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-60"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <p className="text-base font-medium text-zinc-100">{plugin.name}</p>
            <p className="mt-0.5 text-sm text-zinc-400">
              {plugin.author} · v{plugin.version.replace(/^v/i, "")}
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-octo-950/50 p-4">
            <p className="text-sm font-medium text-zinc-200">Opciones</p>
            <label className="flex items-center justify-between gap-4 text-sm text-zinc-400">
              Ejecutar en segundo plano
              <input type="checkbox" defaultChecked className="accent-violet-500" />
            </label>
            <label className="flex items-center justify-between gap-4 text-sm text-zinc-400">
              Notificar fallos por correo
              <input type="checkbox" className="accent-violet-500" />
            </label>
            <label className="block space-y-1.5 text-sm text-zinc-400">
              Intervalo de ejecución
              <select
                defaultValue="15"
                className="h-10 w-full rounded-lg border border-octo-700 bg-octo-950 px-3 text-sm text-zinc-100 outline-none"
              >
                <option value="5">Cada 5 minutos</option>
                <option value="15">Cada 15 minutos</option>
                <option value="60">Cada hora</option>
              </select>
            </label>
            <p className="text-xs text-zinc-500">
              Estas opciones son de demostración y aún no se persisten.
            </p>
          </div>

          <section className="rounded-xl border border-red-500/40 bg-red-500/5 p-4">
            <h4 className="text-sm font-semibold text-red-400">Zona de Peligro</h4>
            <p className="mt-1 text-sm text-zinc-400">
              Desinstalar el plugin lo quita de este workspace. El catálogo no se
              modifica.
            </p>

            {confirming && (
              <p className="mt-3 text-sm font-medium text-red-300">
                ¿Estás seguro de que deseas desinstalar este plugin?
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
                  disabled={isUninstalling}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-octo-700 px-3 text-sm font-medium text-zinc-300 hover:bg-octo-800 disabled:opacity-60"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleUninstall()}
                disabled={isUninstalling}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUninstalling && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}
                {isUninstalling
                  ? "Desinstalando..."
                  : confirming
                    ? "Sí, desinstalar"
                    : "Desinstalar Plugin"}
              </button>
            </div>
          </section>
        </div>
      </dialog>
    </div>
  );
}
