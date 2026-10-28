import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo de Plugins · OCTOMATION",
};

export default function PluginsLayout({ children }: { children: ReactNode }) {
  return children;
}
