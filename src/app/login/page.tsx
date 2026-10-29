"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, Mail } from "lucide-react";

import AuthCard from "@/components/auth/AuthCard";
import AuthField from "@/components/auth/AuthField";
import PasswordField from "@/components/auth/PasswordField";
import {
  notifySessionUpdated,
  readSessionUser,
  type SessionUser,
} from "@/lib/session";
import type { UserRole } from "@/types";

const IAM_URL =
  process.env.NEXT_PUBLIC_IAM_SERVICE_URL ?? "http://localhost:4002";
const TENANT_URL =
  process.env.NEXT_PUBLIC_TENANTS_URL ?? "http://localhost:4004";
const REQUEST_TIMEOUT_MS = 15_000;
const userRoles: UserRole[] = ["SUPER_ADMIN", "TENANT_ADMIN", "MEMBER"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeTokenPayload(token: string): Record<string, unknown> {
  const encodedPayload = token.split(".")[1];
  if (!encodedPayload) {
    throw new Error("IAM devolvió un token de acceso inválido.");
  }

  try {
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (character) =>
      character.charCodeAt(0),
    );
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));

    if (!isRecord(payload)) {
      throw new Error("IAM devolvió un token de acceso inválido.");
    }

    return payload;
  } catch {
    throw new Error("IAM devolvió un token de acceso inválido.");
  }
}

async function getResponseBody(response: Response): Promise<unknown> {
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

function getErrorMessage(body: unknown): string | undefined {
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

function getLoginError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return "El servicio de autenticación tardó demasiado. Inténtalo nuevamente.";
    }

    if (error.name === "TypeError") {
      return "No se pudo conectar con el servicio IAM. Verifica que esté disponible.";
    }

    return error.message;
  }

  return "No se pudo iniciar sesión. Inténtalo nuevamente.";
}

function getRole(payload: Record<string, unknown>): UserRole | undefined {
  if (!Array.isArray(payload.roles)) {
    return undefined;
  }

  for (const role of payload.roles) {
    const matchedRole = userRoles.find((candidate) => candidate === role);
    if (matchedRole) {
      return matchedRole;
    }
  }

  return undefined;
}

async function findUserWorkspace(
  userId: string,
  accessToken: string,
): Promise<{ tenantId: string; workspaceName: string }> {
  const memberResponse = await fetch(
    `${TENANT_URL}/members/by-iam-user/${encodeURIComponent(userId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  const memberBody = await getResponseBody(memberResponse);

  if (!memberResponse.ok) {
    throw new Error(
      getErrorMessage(memberBody) ||
        `No se pudo consultar la empresa asociada (HTTP ${memberResponse.status}).`,
    );
  }

  const memberships = Array.isArray(memberBody)
    ? memberBody
    : isRecord(memberBody) && Array.isArray(memberBody.data)
      ? memberBody.data
      : isRecord(memberBody)
        ? [memberBody]
        : [];
  const membership = memberships.find(
    (item): item is Record<string, unknown> =>
      isRecord(item) && typeof item.tenantId === "string",
  );

  if (!membership || typeof membership.tenantId !== "string") {
    throw new Error(
      "Esta cuenta todavía no tiene una empresa asociada. Completa el registro de la empresa o contacta soporte.",
    );
  }

  const tenantResponse = await fetch(
    `${TENANT_URL}/tenants/${encodeURIComponent(membership.tenantId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  const tenantBody = await getResponseBody(tenantResponse);

  if (!tenantResponse.ok) {
    throw new Error(
      getErrorMessage(tenantBody) ||
        `No se pudo consultar la empresa (HTTP ${tenantResponse.status}).`,
    );
  }

  if (!isRecord(tenantBody) || typeof tenantBody.name !== "string") {
    throw new Error("TENANT no devolvió el nombre de la empresa asociada.");
  }

  return {
    tenantId: membership.tenantId,
    workspaceName: tenantBody.name,
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setIsLoading(true);

    try {
      const response = await fetch(`${IAM_URL}/iam/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const body = await getResponseBody(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(body) ||
            `El servicio respondió con el estado HTTP ${response.status}.`,
        );
      }

      if (!isRecord(body) || typeof body.access_token !== "string") {
        throw new Error("IAM devolvió una respuesta de inicio inválida.");
      }

      const accessToken = body.access_token;
      const claims = decodeTokenPayload(accessToken);
      const previousUser = readSessionUser();
      const previousUserMatches =
        previousUser?.email.toLowerCase() === email.toLowerCase();
      const id =
        typeof claims.sub === "string"
          ? claims.sub
          : previousUserMatches
            ? previousUser.id
            : null;

      if (!id) {
        throw new Error("IAM no devolvió el identificador de esta cuenta.");
      }

      const name =
        typeof claims.fullName === "string"
          ? claims.fullName
          : previousUserMatches
            ? previousUser.name
            : email;
      const { tenantId, workspaceName } = await findUserWorkspace(
        id,
        accessToken,
      );
      const sessionUser: SessionUser = {
        id,
        name,
        email:
          typeof claims.email === "string" ? claims.email : email,
        ...(getRole(claims)
          ? { role: getRole(claims) }
          : previousUserMatches && previousUser.role
            ? { role: previousUser.role }
            : {}),
        tenantId,
        workspaceName,
      };

      try {
        localStorage.setItem("token", accessToken);
        localStorage.setItem("user", JSON.stringify(sessionUser));

        if (sessionUser.tenantId) {
          localStorage.setItem("current_tenant_id", sessionUser.tenantId);
        } else {
          localStorage.removeItem("current_tenant_id");
        }
        notifySessionUpdated();
      } catch {
        throw new Error(
          "El navegador no permitió guardar la sesión. Habilita el almacenamiento local e inténtalo nuevamente.",
        );
      }

      router.push("/dashboard");
    } catch (error: unknown) {
      setErrorMessage(getLoginError(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthCard
      title="Bienvenido de vuelta"
      subtitle="Ingresa tus credenciales para acceder a tu workspace."
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-violet-400 transition-colors hover:text-violet-300"
          >
            Regístrate aquí
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <AuthField
          id="email"
          name="email"
          type="email"
          label="Email"
          icon={Mail}
          placeholder="tu@empresa.com"
          autoComplete="email"
          required
          disabled={isLoading}
        />
        <PasswordField
          id="password"
          name="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading && <LoaderCircle className="size-4 animate-spin" />}
          {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </button>
      </form>
    </AuthCard>
  );
}
