"use client";

import Link from "next/link";
import { ArrowUpRight, Building2, UserRound } from "lucide-react";

import { navItems } from "@/components/layout/nav-items";
import { useSessionUser } from "@/lib/session";

export default function DashboardHome() {
  const user = useSessionUser();
  const firstName = user?.name.split(" ")[0] || "bienvenido";
  const shortcuts = navItems.filter((item) => item.href !== "/dashboard");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Hola, {firstName} 👋
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Este es el espacio de tu cuenta en OCTOMATION.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-octo-800 dark:bg-octo-900/50">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-octo-800">
              <UserRound className="size-5 text-zinc-600 dark:text-zinc-300" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Cuenta activa
              </p>
              <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                {user?.name ?? "Inicia sesión para ver tu cuenta"}
              </p>
              {user?.email && (
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-octo-800 dark:bg-octo-900/50">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-octo-800">
              <Building2 className="size-5 text-zinc-600 dark:text-zinc-300" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Empresa / workspace
              </p>
              <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                {user?.workspaceName ?? "Sin workspace asociado en esta sesión"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Accesos directos
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {shortcuts.map(({ href, label, description, tag, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-octo-800 dark:bg-octo-900/50 dark:hover:border-octo-700 dark:hover:bg-octo-900"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-octo-800 dark:bg-octo-900">
                <Icon className="size-5 text-zinc-700 dark:text-zinc-300" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {label}
                  </span>
                  {tag && (
                    <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                      {tag}
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                  {description}
                </span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-zinc-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
