import type { Metadata } from "next";

import MembersView from "@/components/members/MembersView";

export const metadata: Metadata = {
  title: "Miembros del Equipo · OCTOMATION",
};

export default function MembersPage() {
  return <MembersView />;
}
