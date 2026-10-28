"use client";

import { Puzzle, Settings2, User } from "lucide-react";

import type { CatalogPlugin } from "@/types";

interface InstalledPluginsGridProps {
  plugins: CatalogPlugin[];
  onConfigure: (plugin: CatalogPlugin) => void;
}

export default function InstalledPluginsGrid({
  plugins,
  onConfigure,
}: InstalledPluginsGridProps) {
  if (plugins.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-octo-700 p-10 text-center text-sm text-zinc-400">
        Este workspace no tiene plugins instalados. Explora el catálogo para
        agregar uno.
      </div>
    );
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {plugins.map((plugin) => (
        <article
          key={plugin.id}
          className="flex flex-col rounded-2xl border border-white/10 bg-octo-900/60 p-6 shadow-xl shadow-black/20 backdrop-blur-xl transition-colors hover:border-violet-500/40"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/30">
              <Puzzle className="size-6" />
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              Instalado
            </span>
          </div>

          <h3 className="mt-5 text-lg font-semibold text-zinc-100">
            {plugin.name}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-400">
            <User className="size-3.5 shrink-0" />
            {plugin.author}
          </p>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">
            {plugin.description}
          </p>

          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="font-mono text-xs text-zinc-500">
              v{plugin.version.replace(/^v/i, "")}
            </span>
            <button
              type="button"
              onClick={() => onConfigure(plugin)}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500"
            >
              <Settings2 className="size-3.5" />
              Configurar
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
