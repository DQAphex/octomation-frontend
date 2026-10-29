"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, LoaderCircle, Store, TriangleAlert } from "lucide-react";

import SimulateMemberHackButton from "@/components/members/SimulateMemberHackButton";
import ConfigurePluginModal from "@/components/plugins/ConfigurePluginModal";
import InstalledPluginsGrid from "@/components/plugins/InstalledPluginsGrid";
import {
  listPlugins,
  listWorkspacePlugins,
  PLUGINS_URL,
  toInstalledPlugin,
  unwrapList,
} from "@/lib/api/plugins";
import type { CatalogPlugin } from "@/types";

export default function WorkspacePluginsPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [plugins, setPlugins] = useState<CatalogPlugin[]>([]);
  const [selected, setSelected] = useState<CatalogPlugin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInstalled = useCallback(
    async (signal?: AbortSignal) => {
      if (!workspaceId) return;
      try {
        const [installedResult, catalogResult] = await Promise.all([
          listWorkspacePlugins(workspaceId),
          listPlugins(),
        ]);
        if (signal?.aborted) return;

        if (!installedResult.ok) {
          setError(installedResult.error);
          return;
        }

        const rows = unwrapList(installedResult.data);
        const catalog = catalogResult.ok
          ? unwrapList(catalogResult.data)
          : [];
        const catalogById = new Map(
          catalog.map((plugin) => [
            plugin.pluginId ?? plugin.id ?? "",
            plugin,
          ]),
        );

        setPlugins(
          rows.map((row) =>
            toInstalledPlugin(row, catalogById.get(row.pluginId)),
          ),
        );
        setError(null);
      } catch (err: unknown) {
        if (signal?.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los plugins instalados",
        );
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        await loadInstalled(controller.signal);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [loadInstalled]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard/workspaces"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <ArrowLeft className="size-4" />
            Volver a Workspaces
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Plugins Activos en este Workspace
          </h2>
          <p className="mt-1 font-mono text-xs text-zinc-500">{workspaceId}</p>
        </div>
        <Link
          href="/dashboard/plugins"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500"
        >
          <Store className="size-4" />
          Explorar Catálogo
        </Link>
      </header>

      {workspaceId && <SimulateMemberHackButton workspaceId={workspaceId} />}

      {isLoading ? (
        <div className="flex min-h-56 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-octo-900/40 text-sm text-zinc-400">
          <LoaderCircle className="size-5 animate-spin text-violet-400" />
          Cargando plugins instalados...
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">
              No se pudieron cargar los plugins instalados.
            </p>
            <p className="mt-1 text-red-300/80">
              {error}. Verifica que el servicio esté en{" "}
              <span className="font-mono">{PLUGINS_URL}</span>.
            </p>
          </div>
        </div>
      ) : (
        <InstalledPluginsGrid plugins={plugins} onConfigure={setSelected} />
      )}

      {selected && (
        <ConfigurePluginModal
          workspaceId={workspaceId}
          plugin={selected}
          onClose={() => setSelected(null)}
          onUninstalled={(pluginId) =>
            setPlugins((current) =>
              current.filter((plugin) => plugin.id !== pluginId),
            )
          }
        />
      )}
    </div>
  );
}
