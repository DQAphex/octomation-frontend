"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  LoaderCircle,
  Mail,
  User,
} from "lucide-react";

import AuthCard from "@/components/auth/AuthCard";
import AuthField from "@/components/auth/AuthField";
import PasswordField from "@/components/auth/PasswordField";
import { notifySessionUpdated } from "@/lib/session";

const REQUEST_TIMEOUT_MS = 15_000;

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

  if (!isJsonObject(body)) {
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

function assertSuccessfulResponse(response: Response, body: unknown): void {
  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(body) ||
        `El servicio respondió con el estado HTTP ${response.status}.`
    );
  }
}

function getRequiredString(
  body: JsonObject,
  keys: string[],
  description: string
): string {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  throw new Error(`La respuesta del servicio no incluye ${description}.`);
}

async function postJson(
  baseUrl: string,
  path: string,
  payload: JsonObject,
  accessToken?: string
): Promise<Response> {
  return fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

function getRequestErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return "El servicio tardó demasiado en responder. Inténtalo nuevamente.";
    }

    if (error.name === "TypeError") {
      return "No se pudo conectar con los servicios. Verifica que estén disponibles y que permitan solicitudes desde http://localhost:3000.";
    }

    return error.message;
  }

  return "Ocurrió un error inesperado al crear la cuenta.";
}

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const iamUrl =
    process.env.NEXT_PUBLIC_IAM_SERVICE_URL ?? "http://localhost:4002";
  const tenantUrl =
    process.env.NEXT_PUBLIC_TENANTS_URL ?? "http://localhost:4004";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const companyName = String(formData.get("workspace") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!fullName || !companyName || !email || !password) {
      setErrorMessage("Completa todos los campos para continuar.");
      return;
    }

    setIsLoading(true);
    let userCreated = false;
    let tenantCreated = false;
    let memberCreated = false;

    try {
      const registerResponse = await postJson(iamUrl, "/iam/register", {
        fullName,
        email,
        password,
      });
      const registerBody = await readResponseBody(registerResponse);
      assertSuccessfulResponse(registerResponse, registerBody);

      if (!isJsonObject(registerBody)) {
        throw new Error("IAM devolvió una respuesta de registro inválida.");
      }

      userCreated = true;
      const userId = getRequiredString(
        registerBody,
        ["userId", "id"],
        "el identificador del usuario"
      );

      const loginResponse = await postJson(iamUrl, "/iam/login", {
        email,
        password,
      });
      const loginBody = await readResponseBody(loginResponse);
      assertSuccessfulResponse(loginResponse, loginBody);

      if (!isJsonObject(loginBody)) {
        throw new Error("IAM devolvió una respuesta de inicio de sesión inválida.");
      }

      const accessToken = getRequiredString(
        loginBody,
        ["access_token", "accessToken"],
        "el token de acceso"
      );

      const tenantResponse = await postJson(
        tenantUrl,
        "/tenants",
        {
          name: companyName,
          rut: 76000000,
          dv: "K",
          type: "EMPRESA",
        },
        accessToken
      );
      const tenantBody = await readResponseBody(tenantResponse);
      assertSuccessfulResponse(tenantResponse, tenantBody);

      if (!isJsonObject(tenantBody)) {
        throw new Error("TENANT devolvió una respuesta de empresa inválida.");
      }

      tenantCreated = true;
      const tenantId = getRequiredString(
        tenantBody,
        ["tenantId", "id"],
        "el identificador de la empresa"
      );

      const memberResponse = await postJson(
        tenantUrl,
        "/members",
        {
          iamUserId: userId,
          tenantId,
        },
        accessToken
      );
      const memberBody = await readResponseBody(memberResponse);
      assertSuccessfulResponse(memberResponse, memberBody);
      memberCreated = true;

      try {
        localStorage.setItem("token", accessToken);
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: userId,
            name: fullName,
            fullName,
            email,
            role: "TENANT_ADMIN",
            tenantId,
            workspaceName: companyName,
          })
        );
        localStorage.setItem("current_tenant_id", tenantId);
        notifySessionUpdated();
      } catch {
        throw new Error(
          "La cuenta y la empresa fueron creadas, pero el navegador no permitió guardar la sesión. Habilita el almacenamiento local e inicia sesión."
        );
      }

      router.push("/dashboard");
    } catch (error: unknown) {
      const requestError = getRequestErrorMessage(error);

      if (memberCreated) {
        setErrorMessage(
          `${requestError} La cuenta y la empresa ya están asociadas; inicia sesión para continuar.`
        );
      } else if (tenantCreated) {
        setErrorMessage(
          `${requestError} Se creó la cuenta y la empresa, pero no se pudo completar la asociación del miembro. Contacta soporte antes de volver a registrarte.`
        );
      } else if (userCreated) {
        setErrorMessage(
          `${requestError} El usuario ya fue creado, pero el onboarding no terminó. No vuelvas a registrarte con este correo; inicia sesión o contacta soporte.`
        );
      } else {
        setErrorMessage(requestError);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthCard
      title="Crea tu cuenta"
      subtitle="Configura tu workspace y empieza a automatizar en minutos."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-violet-400 transition-colors hover:text-violet-300"
          >
            Inicia sesión
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
          id="fullName"
          name="fullName"
          type="text"
          label="Nombre Completo"
          icon={User}
          placeholder="Juan Pérez"
          autoComplete="name"
          required
          disabled={isLoading}
        />
        <AuthField
          id="workspace"
          name="workspace"
          type="text"
          label="Nombre de la Empresa"
          icon={Building2}
          placeholder="Acme Corp"
          autoComplete="organization"
          required
          disabled={isLoading}
        />
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
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading && <LoaderCircle className="size-4 animate-spin" />}
          {isLoading
            ? "Creando cuenta y configurando empresa..."
            : "Crear Cuenta"}
        </button>
      </form>
    </AuthCard>
  );
}
