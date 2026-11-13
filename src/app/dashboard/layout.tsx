import { Suspense } from "react";

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-white dark:bg-octo-950">
      <Suspense
        fallback={
          <div
            aria-hidden="true"
            className="hidden w-64 shrink-0 lg:block"
          />
        }
      >
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense
          fallback={
            <div
              aria-hidden="true"
              className="h-16 border-b border-zinc-200 dark:border-octo-800"
            />
          }
        >
          <Navbar />
        </Suspense>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
