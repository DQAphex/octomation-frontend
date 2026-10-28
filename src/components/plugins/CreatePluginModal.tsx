"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Code2, LoaderCircle, Puzzle, TriangleAlert } from "lucide-react";

import {
  createPlugin,
  fetchGithubReleases,
  normalizeVersionParts,
  type CreatePluginPayload,
  type GithubRelease,
} from "@/lib/api/plugins";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClassName =
  "h-11 w-full rounded-lg border border-octo-700 bg-octo-950/70 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60";

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

interface CreatePluginModalProps {
  onClose: () => void;
}

export default function CreatePluginModal({ onClose }: CreatePluginModalProps) {
  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [email, setEmail] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [releases, setReleases] = useState<GithubRelease[]>([]);
  const [isLoadingReleases, setIsLoadingReleases] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorReleases, setErrorReleases] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const versions = normalizeVersionParts(selectedTag);
  const payload: CreatePluginPayload = {
    name,
    pluginCategory: "General",
    author,
    email,
    repositoryUrl,
    latestVersion: versions.latestVersion,
    releaseTag: versions.releaseTag,
    pluginCreatedAt: new Date().toISOString(),
  };

  const trimmedName = name.trim();
  const trimmedAuthor = author.trim();
  const trimmedEmail = email.trim();
  const trimmedUrl = repositoryUrl.trim();
  const emailError =
    trimmedEmail.length > 0 && !isValidEmail(trimmedEmail)
      ? "Ingresa un correo válido, por ejemplo usuario@dominio.com."
      : "";
  const urlFormatError =
    trimmedUrl.length > 0 && !isValidHttpUrl(trimmedUrl)
      ? "Ingresa una URL válida que comience con http:// o https://."
      : "";
  const isFormValid =
    trimmedName.length > 0 &&
    trimmedAuthor.length > 0 &&
    isValidEmail(trimmedEmail) &&
    isValidHttpUrl(trimmedUrl) &&
    selectedTag.length > 0 &&
    !isSubmitting;

  async function loadReleases(url = repositoryUrl) {
    const trimmed = url.trim();
    if (!isValidHttpUrl(trimmed)) {
      setReleases([]);
      setSelectedTag("");
      setErrorReleases(
        "Ingresa una URL válida que comience con http:// o https://.",
      );
      return;
    }

    setIsLoadingReleases(true);
    setErrorReleases("");
    setSelectedTag("");

    try {
      const result = await fetchGithubReleases(trimmed);
      if (!result.ok) {
        if (result.aborted) return;
        console.error("Error al cargar releases:", result.error);
        setReleases([]);
        setErrorReleases(
          result.error ||
            "No se pudieron cargar las versiones. Verifica la URL o el servidor",
        );
        return;
      }

      const items = Array.isArray(result.data) ? result.data : result.data.data;
      const published = (items ?? []).filter((release) => !release.draft);
      setReleases(published);
      setErrorReleases("");
      if (published.length === 0) {
        setErrorReleases("Este repositorio no tiene releases publicadas.");
      }
    } catch (error: unknown) {
      console.error("Error al cargar releases:", error);
      setReleases([]);
      setErrorReleases(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las versiones. Verifica la URL o el servidor",
      );
    } finally {
      setIsLoadingReleases(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body: CreatePluginPayload = {
      ...payload,
      name: payload.name.trim(),
      author: payload.author.trim(),
      email: payload.email.trim(),
      repositoryUrl: payload.repositoryUrl.trim(),
      pluginCreatedAt: new Date().toISOString(),
    };

    if (!body.name || !body.author || !body.email || !body.repositoryUrl) {
      setSubmitError("Completa todos los campos del formulario.");
      return;
    }
    if (!selectedTag) {
      setSubmitError("Selecciona una versión del plugin.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await createPlugin(body);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      onClose();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "No se pudo registrar el plugin",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <dialog
        open
        aria-labelledby="create-plugin-title"
        className="m-0 w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-octo-900 text-zinc-100 shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Puzzle className="size-4 text-violet-400" />
            <h3
              id="create-plugin-title"
              className="text-lg font-semibold tracking-tight"
            >
              Creación de Plugins
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-60"
          >
            Cerrar
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-0 lg:grid-cols-2"
        >
          <div className="space-y-4 border-b border-white/10 p-6 lg:border-r lg:border-b-0">
            <Field label="Nombre de Plugin">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Generador de Plugins"
                maxLength={100}
                disabled={isSubmitting}
                className={inputClassName}
              />
            </Field>

            <Field label="Autor de plugin">
              <input
                type="text"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="Diego Quioza"
                maxLength={100}
                disabled={isSubmitting}
                className={inputClassName}
              />
            </Field>

            <div className="space-y-1.5">
              <label
                htmlFor="plugin-author-email"
                className="block text-sm font-medium text-zinc-300"
              >
                Email de Autor
              </label>
              <input
                id="plugin-author-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="dquioza@smu.cl"
                disabled={isSubmitting}
                aria-invalid={Boolean(emailError)}
                className={inputClassName}
              />
              {emailError && (
                <p className="text-xs text-red-400">{emailError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="plugin-repo-url"
                className="block text-sm font-medium text-zinc-300"
              >
                Url del repositorio de github
              </label>
              <input
                id="plugin-repo-url"
                type="url"
                value={repositoryUrl}
                onChange={(event) => {
                  setRepositoryUrl(event.target.value);
                  if (errorReleases) setErrorReleases("");
                }}
                onBlur={() => {
                  if (isValidHttpUrl(repositoryUrl)) void loadReleases();
                }}
                placeholder="https://github.com/OWNER/plugins"
                disabled={isSubmitting}
                aria-invalid={Boolean(urlFormatError || errorReleases)}
                className={inputClassName}
              />
              {urlFormatError && (
                <p className="text-xs text-red-400">{urlFormatError}</p>
              )}
              {!urlFormatError && errorReleases && (
                <p className="text-xs text-red-400">{errorReleases}</p>
              )}
            </div>

            <Field label="Version del plugin">
              <div className="flex gap-2">
                <select
                  value={selectedTag}
                  onChange={(event) => setSelectedTag(event.target.value)}
                  disabled={isSubmitting || isLoadingReleases || releases.length === 0}
                  className={inputClassName}
                >
                  <option value="">
                    {isLoadingReleases
                      ? "Cargando versiones..."
                      : "Selecciona la versión"}
                  </option>
                  {releases.map((release) => (
                    <option key={release.id} value={release.tag_name}>
                      {release.tag_name}
                      {release.name ? ` · ${release.name}` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void loadReleases()}
                  disabled={
                    isSubmitting ||
                    isLoadingReleases ||
                    !isValidHttpUrl(repositoryUrl)
                  }
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-octo-700 px-3 text-sm font-medium text-zinc-300 transition-colors hover:border-violet-500/50 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoadingReleases && (
                    <LoaderCircle className="size-4 animate-spin" />
                  )}
                  {isLoadingReleases ? "Cargando..." : "Cargar"}
                </button>
              </div>
            </Field>

            <p className="text-xs leading-relaxed text-zinc-500">
              Al ingresar la URL se consulta{" "}
              <span className="font-mono text-zinc-400">
                POST /plugins/github/releases
              </span>{" "}
              y el selector se llena con cada <span className="font-mono">tag_name</span>.
            </p>
          </div>

          <div className="space-y-4 p-6">
            <p className="flex items-center gap-2 text-sm text-zinc-400">
              <Code2 className="size-4 text-violet-400" />
              curl -X POST http://localhost:4005/plugins/
            </p>
            <pre className="min-h-64 overflow-auto rounded-xl border border-white/5 bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-300 shadow-inner">
              <code>{JSON.stringify(payload, null, 2)}</code>
            </pre>

            {submitError && (
              <p className="flex items-start gap-2 text-sm text-red-400">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {submitError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-octo-700 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-octo-800 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isFormValid}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
                {isSubmitting ? "Registrando..." : "Registrar plugin"}
              </button>
            </div>
          </div>
        </form>
      </dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      {children}
    </label>
  );
}
