"use client";

import { useState } from "react";
import { Puzzle } from "lucide-react";

import CreatePluginModal from "@/components/plugins/CreatePluginModal";
import PluginCatalogGrid from "@/components/plugins/PluginCatalogGrid";
import { catalogPlugins } from "@/lib/mock-data";

export default function PluginsPage() {
  const [isPluginModalOpen, setIsPluginModalOpen] = useState(false);

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

      <PluginCatalogGrid plugins={catalogPlugins} />

      {isPluginModalOpen && (
        <CreatePluginModal onClose={() => setIsPluginModalOpen(false)} />
      )}
    </div>
  );
}
