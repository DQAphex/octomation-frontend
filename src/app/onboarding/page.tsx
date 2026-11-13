"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, LoaderCircle, TriangleAlert } from "lucide-react";

import AuthCard from "@/components/auth/AuthCard";
import {
  notifySessionUpdated,
  useSessionUser,
  type SessionUser,
} from "@/lib/session";

const TENANTS_URL =
  process.env.NEXT_PUBLIC_TENANTS_URL ?? "http://localhost:4004";

const TENANT_ID_KEY = "current_tenant_id";
const PENDING_TENANT_KEY = "pending_onboarding_tenant";
const REQUEST_TIMEOUT_MS = 15_000;

function subscribeToNothing(): () => void {
  return () => {};
}

function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

interface PendingTenant {
  tenantId: string;
  name: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getTenantId(body: Record<string, unknown>): string | undefined {
  const id = body.tenantId ?? body.tenant_id ?? body.id;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

function readPendingTenant(): PendingTenant | null {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(PENDING_TENANT_KEY) ?? "null",
    );
    if (
      isRecord(value) &&
      typeof value.tenantId === "string" &&
      typeof value.name === "string"
    ) {
      return { tenantId: value.tenantId, name: value.name };
    }
  } catch {
    // Ignorar datos corruptos y volver a crear la empresa.
  }
  return null;
}

function getInitialCompanyName(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return readPendingTenant()?.name ?? "";
}

function writePendingTenant(pending: PendingTenant): void {
  localStorage.setItem(PENDING_TENANT_KEY, JSON.stringify(pending));
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getApiErrorMessage(body: unknown): string | undefined {
  if (typeof body === "string") {
    return body;
  }

  if (!isRecord(body)) {
    return undefined;
  }

  const message = body.message ?? body.error;
  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return message.map(String).join(", ");
  }

  return undefined;
}

export default function OnboardingPage() {
  const router = useRouter();
  const isClient = useIsClient();
  const user = useSessionUser();
  const [companyName, setCompanyName] = useState(getInitialCompanyName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.tenantId) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = companyName.trim();

    if (!name) {
      setError("Ingresa el nombre de la empresa.");
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    setIsLoading(true);
    setError(null);

    let pending = readPendingTenant();
    let tenantId = pending?.tenantId;

    try {
      if (!tenantId) {
        const res = await fetch(`${TENANTS_URL}/tenants`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            rut: 0,
            dv: "0",
            type: "EMPRESA",
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        const body = await readResponseBody(res);

        if (!res.ok) {
          throw new Error(
            getApiErrorMessage(body) ||
              `Error ${res.status} al registrar la empresa`,
          );
        }

        if (!isRecord(body)) {
          throw new Error("La API no devolvió la empresa creada");
        }

        tenantId = getTenantId(body);
        if (!tenantId) {
          throw new Error("La API no devolvió el identificador del tenant");
        }

        pending = { tenantId, name };
        writePendingTenant(pending);
      }

      const memberRes = await fetch(`${TENANTS_URL}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          iamUserId: user.id,
          tenantId,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const memberBody = await readResponseBody(memberRes);

      if (!memberRes.ok) {
        throw new Error(
          getApiErrorMessage(memberBody) ||
            `Error ${memberRes.status} al asociar tu cuenta a la empresa`,
        );
      }

      const sessionUser: SessionUser = {
        ...user,
        tenantId,
        workspaceName: name,
      };

      localStorage.setItem("user", JSON.stringify(sessionUser));
      localStorage.setItem(TENANT_ID_KEY, tenantId);
      localStorage.removeItem(PENDING_TENANT_KEY);
      notifySessionUpdated();
      router.push("/dashboard");
    } catch (err: unknown) {
      const requestError =
        err instanceof Error
          ? err.message
          : "No se pudo registrar la empresa";
      setError(
        pending
          ? `${requestError} La empresa ya fue creada; vuelve a intentarlo para asociar tu cuenta.`
          : requestError,
      );
      setIsLoading(false);
    }
  }

  if (!isClient) {
    return null;
  }

  if (!user) {
    return (
      <AuthCard
        title="Inicia sesión"
        subtitle="Necesitas una sesión activa para registrar tu empresa."
        footer="Si aún no tienes cuenta, puedes crearla en el registro."
      >
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-violet-600 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500"
        >
          Ir a iniciar sesión
        </Link>
      </AuthCard>
    );
  }

  if (user.tenantId) {
    return null;
  }

  return (
    <AuthCard
      title="Registra tu empresa"
      subtitle="Tu cuenta aún no tiene una empresa asociada. Crea el espacio de tu organización para empezar a usar OCTOMATION."
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
