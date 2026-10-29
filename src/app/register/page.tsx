"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, LoaderCircle, Mail, TriangleAlert, User } from "lucide-react";

import AuthCard from "@/components/auth/AuthCard";
import AuthField from "@/components/auth/AuthField";
import PasswordField from "@/components/auth/PasswordField";
import { IAM_URL } from "@/lib/api/iam";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const res = await fetch(`${IAM_URL}/iam/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      if (!res.ok) {
        let message = "No se pudo crear la cuenta. Inténtalo de nuevo.";
        try {
          const body = (await res.json()) as { message?: string | string[] };
          if (typeof body.message === "string") message = body.message;
          else if (Array.isArray(body.message)) message = body.message.join(". ");
        } catch {
          // Sin cuerpo JSON.
        }
        setError(message);
        return;
      }

      router.push("/login");
    } catch {
      setError("No se pudo conectar con el servidor de autenticación.");
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
          label="Nombre de la Empresa (Workspace)"
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
          {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
        </button>
      </form>
    </AuthCard>
  );
}
