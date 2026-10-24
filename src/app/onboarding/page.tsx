"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, LoaderCircle, TriangleAlert } from "lucide-react";

import AuthCard from "@/components/auth/AuthCard";

const TENANTS_URL =
  process.env.NEXT_PUBLIC_TENANTS_URL ?? "http://localhost:4004";

const TENANT_ID_KEY = "current_tenant_id";

interface CreatedTenant {
  tenantId?: string;
  tenant_id?: string;
  id?: string;
}

function getTenantId(body: CreatedTenant): string | null {
  const id = body.tenantId ?? body.tenant_id ?? body.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = companyName.trim();

    if (!name) {
      setError("Ingresa el nombre de la empresa.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${TENANTS_URL}/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          rut: 0,
          dv: "0",
          type: "EMPRESA",
        }),
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status} al registrar la empresa`);
      }

      const tenant = (await res.json()) as CreatedTenant;
      const tenantId = getTenantId(tenant);

      if (!tenantId) {
        throw new Error("La API no devolvió el identificador del tenant");
      }

      localStorage.setItem(TENANT_ID_KEY, tenantId);
      router.push("/dashboard/workspaces");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar la empresa",
      );
      setIsLoading(false);
    }
  }

  return (
    <AuthCard
      title="Registra tu empresa"
      subtitle="Crea el espacio de tu organización para empezar a usar OCTOMATION."
      footer="Podrás invitar a tu equipo desde el dashboard."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-300">
            Nombre de la Empresa
          </span>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              autoFocus
              type="text"
              name="name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Acme SpA"
              maxLength={45}
              autoComplete="organization"
              disabled={isLoading}
              className="h-11 w-full rounded-lg border border-octo-700 bg-octo-950/70 pr-3 pl-10 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
            />
          </div>
        </label>

        {error && (
          <p className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading && <LoaderCircle className="size-4 animate-spin" />}
          {isLoading ? "Registrando..." : "Continuar"}
        </button>
      </form>
    </AuthCard>
  );
}
