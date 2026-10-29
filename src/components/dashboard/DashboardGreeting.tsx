"use client";

import { useEffect, useState } from "react";

import { getSessionDisplayName, getSessionUser } from "@/lib/auth/session";

export default function DashboardGreeting() {
  const [name, setName] = useState("ahí");

  useEffect(() => {
    setName(getSessionDisplayName(getSessionUser()));
  }, []);

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Hola, {name} 👋
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Este es el resumen de tu organización en OCTOMATION.
      </p>
    </section>
  );
}
