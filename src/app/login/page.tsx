"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Mail, TriangleAlert } from "lucide-react";

import AuthCard from "@/components/auth/AuthCard";
import AuthField from "@/components/auth/AuthField";
import PasswordField from "@/components/auth/PasswordField";
import { IAM_URL } from "@/lib/api/iam";
import { decodeJwtPayload } from "@/lib/auth/session";
import { notifySessionUpdated, type SessionUser } from "@/lib/session";
import type { UserRole } from "@/types";

const LOGIN_ERROR = "Credenciales incorrectas o error en el servidor";
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
    const base64 = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
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
  const singleRole = userRoles.find((candidate) => candidate === payload.role);
  if (singleRole) {
    return singleRole;
  }

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
): Promise<{ tenantId: string; workspaceName: string } | null> {
  const memberResponse = await fetch(
    `${TENANT_URL}/members/data/iam-user/${encodeURIComponent(userId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  const memberBody = await getResponseBody(memberResponse);

  if (memberResponse.status === 404) {
    return null;
  }

  if (!memberResponse.ok) {
    throw new Error(
      getErrorMessage(memberBody) ||
        `No se pudo consultar la empresa asociada (HTTP ${memberResponse.status}).`,
    );
  }

  const membership = Array.isArray(memberBody)
    ? memberBody.find(
        (item): item is Record<string, unknown> =>
          isRecord(item) && typeof item.tenantId === "string",
      )
    : isRecord(memberBody) && isRecord(memberBody.data)
      ? memberBody.data
      : isRecord(memberBody)
        ? memberBody
        : null;

  if (!membership || typeof membership.tenantId !== "string") {
    return null;
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
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const res = await fetch(`${IAM_URL}/iam/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setError(LOGIN_ERROR);
        return;
      }

      if (!isRecord(body)) {
        throw new Error("IAM devolvió una respuesta de inicio inválida.");
      }

      const accessToken = [
        body.access_token,
        body.accessToken,
        body.token,
      ].find(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      );

      if (!accessToken) {
        throw new Error("IAM devolvió una respuesta de inicio inválida.");
      }

      const claims = decodeTokenPayload(accessToken);
      const previousUser = readSessionUser();
      const previousUserMatches =
        previousUser?.email.toLowerCase() === email.toLowerCase();
      const id =
        typeof claims.sub === "string"
          ? claims.sub
          : typeof claims.id === "string"
            ? claims.id
            : previousUserMatches
              ? previousUser.id
              : null;

      if (!token) {
        setError(LOGIN_ERROR);
        return;
      }

      const name =
        typeof claims.fullName === "string"
          ? claims.fullName
          : previousUserMatches
            ? previousUser.name
            : email;
      const workspace = await findUserWorkspace(id, accessToken);
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
        ...(workspace
          ? {
              tenantId: workspace.tenantId,
              workspaceName: workspace.workspaceName,
            }
          : {}),
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

      router.push(workspace ? "/dashboard" : "/onboarding");
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

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 text-sm text-red-400"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

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
