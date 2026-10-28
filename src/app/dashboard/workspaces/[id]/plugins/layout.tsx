import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plugins del Workspace · OCTOMATION",
};

export default function WorkspacePluginsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
