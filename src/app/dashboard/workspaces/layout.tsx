import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mis Workspaces · OCTOMATION",
};

export default function WorkspacesLayout({
  children,
}: LayoutProps<"/dashboard/workspaces">) {
  return children;
}
