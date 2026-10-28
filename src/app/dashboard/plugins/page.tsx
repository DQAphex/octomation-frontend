"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, LoaderCircle, Puzzle, TriangleAlert } from "lucide-react";

import CreatePluginModal from "@/components/plugins/CreatePluginModal";
import InstallPluginModal from "@/components/plugins/InstallPluginModal";
import PluginCatalogGrid from "@/components/plugins/PluginCatalogGrid";
import { listPlugins, PLUGINS_URL, toCatalogPlugin } from "@/lib/api/plugins";
import type { CatalogPlugin } from "@/types";

export default function PluginsPage() {
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);
  const [plugins, setPlugins] = useState<CatalogPlugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pluginToInstall, setPluginToInstall] = useState<CatalogPlugin | null>(
    null,
  );
  const [installedPluginIds, setInstalledPluginIds] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const installedTimeouts = useRef<Map<string, number>>(new Map());

  const loadPlugins = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await listPlugins();
      if (signal?.aborted) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const items = Array.isArray(result.data) ? result.data : result.data.data;
      setPlugins((items ?? []).map(toCatalogPlugin));
      setError(null);
    } catch (err: unknown) {
      if (signal?.aborted) return;
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los plugins",
      );
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        await loadPlugins(controller.signal);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => {
      controller.abort();
      installedTimeouts.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      installedTimeouts.current.clear();
    };
  }, [loadPlugins]);

  function handleInstalled(plugin: CatalogPlugin, workspaceName: string) {
    setSuccessMessage(
      `${plugin.name} se instaló correctamente en ${workspaceName}.`,
    );
    setInstalledPluginIds((current) =>
      current.includes(plugin.id) ? current : [...current, plugin.id],
    );

    const previous = installedTimeouts.current.get(plugin.id);
    if (previous) window.clearTimeout(previous);

    const timeoutId = window.setTimeout(() => {
      installedTimeouts.current.delete(plugin.id);
      setInstalledPluginIds((current) =>
        current.filter((id) => id !== plugin.id),
      );
    }, 4000);
    installedTimeouts.current.set(plugin.id, timeoutId);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Catálogo de Plugins
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Explora automatizaciones listas para instalar en tu workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsPluginModalOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500"
        >
          <Puzzle className="size-4" />
          Crear plugin
        </button>
      </header>

      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-300">
          <CircleCheck className="mt-0.5 size-4 shrink-0" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-56 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-octo-900/40 text-sm text-zinc-400">
          <LoaderCircle className="size-5 animate-spin text-violet-400" />
          Cargando plugins...
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">No se pudieron cargar los plugins.</p>
            <p className="mt-1 text-red-300/80">
              {error}. Verifica que el servicio esté en{" "}
              <span className="font-mono">{PLUGINS_URL}</span>.
            </p>
          </div>
        </div>
      ) : plugins.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-octo-700 p-10 text-center text-sm text-zinc-400">
          Todavía no hay plugins en el catálogo. Crea el primero.
        </div>
      ) : (
        <PluginCatalogGrid
          plugins={plugins}
          installedPluginIds={installedPluginIds}
          onAddToWorkspace={setPluginToInstall}
        />
      )}

      {isPluginModalOpen && (
        <CreatePluginModal
          onClose={() => setIsPluginModalOpen(false)}
          onCreated={() => void loadPlugins()}
        />
      )}

      {pluginToInstall && (
        <InstallPluginModal
          plugin={pluginToInstall}
          onClose={() => setPluginToInstall(null)}
          onInstalled={(workspaceName) =>
            handleInstalled(pluginToInstall, workspaceName)
          }
        />
      )}
    </div>
  );
}
