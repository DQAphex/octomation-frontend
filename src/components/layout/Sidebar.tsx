"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Menu, Workflow, X } from "lucide-react";

import { useSessionUser } from "@/lib/session";
import { isNavItemActive, navItems } from "./nav-items";

function WorkspaceSwitcher() {
  const user = useSessionUser();
  const workspaceName = user?.workspaceName ?? "Workspace personal";

  return (
    <div className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm dark:border-octo-800 dark:bg-octo-900">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
        <Building2 className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">
          {workspaceName}
        </span>
        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
          {user?.email ?? "Tu espacio"}
        </span>
      </span>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
        className="fixed left-3 top-3 z-30 flex size-10 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 lg:hidden dark:text-zinc-300 dark:hover:bg-octo-800"
      >
        <Menu className="size-5" />
      </button>

      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 dark:border-octo-800 dark:bg-octo-950 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
              <Workflow className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
              OCTOMATION
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            className="flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-200 lg:hidden dark:hover:bg-octo-800"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-3 pb-4">
          <WorkspaceSwitcher />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Plataforma
          </p>
          {navItems.map(({ href, label, tag, icon: Icon }) => {
            const active = isNavItemActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-octo-900 dark:text-zinc-100 dark:ring-octo-800"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-octo-900 dark:hover:text-zinc-100"
                }`}
              >
                <Icon
                  className={`size-4 shrink-0 ${
                    active
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                  }`}
                />
                <span className="flex-1 truncate">{label}</span>
                {tag && (
                  <span className="rounded border border-zinc-200 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 dark:border-octo-800 dark:text-zinc-500">
                    {tag}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 p-4 text-xs text-zinc-400 dark:border-octo-800 dark:text-zinc-500">
          © OCTOMATION · v0.1.0
        </div>
      </aside>
    </>
  );
}
