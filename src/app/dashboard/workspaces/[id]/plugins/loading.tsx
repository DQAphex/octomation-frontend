import { LoaderCircle } from "lucide-react";

export default function WorkspacePluginsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-octo-800" />
        <div className="h-8 w-72 max-w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-octo-800" />
        <div className="h-3 w-56 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-octo-800" />
      </div>
      <div className="flex min-h-56 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-octo-900/40 text-sm text-zinc-400">
        <LoaderCircle className="size-5 animate-spin text-violet-400" />
        Cargando plugins instalados...
      </div>
    </div>
  );
}
