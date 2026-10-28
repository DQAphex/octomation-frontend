import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";

import InstalledPluginsGrid from "@/components/plugins/InstalledPluginsGrid";
import { installedPlugins } from "@/lib/mock-data";

export default async function WorkspacePluginsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
          <p className="mt-1 font-mono text-xs text-zinc-500">{id}</p>
        </div>
        <Link
          href="/dashboard/plugins"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500"
        >
          <Store className="size-4" />
          Explorar Catálogo
        </Link>
      </header>

      <InstalledPluginsGrid plugins={installedPlugins} />
    </div>
  );
}
