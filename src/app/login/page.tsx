"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Mail, TriangleAlert } from "lucide-react";

import AuthCard from "@/components/auth/AuthCard";
import AuthField from "@/components/auth/AuthField";
import PasswordField from "@/components/auth/PasswordField";
import { IAM_URL } from "@/lib/api/iam";

const LOGIN_ERROR = "Credenciales incorrectas o error en el servidor";

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

      const data = (await res.json()) as {
        token?: string;
        access_token?: string;
      };
      const token = data.token ?? data.access_token;

      if (!token) {
        setError(LOGIN_ERROR);
        return;
      }

      localStorage.setItem("token", token);
      router.push("/dashboard");
    } catch {
      setError(LOGIN_ERROR);
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
