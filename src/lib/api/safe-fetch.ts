export interface SafeFetchSuccess<T> {
  ok: true;
  data: T;
}

export interface SafeFetchFailure {
  ok: false;
  error: string;
  aborted: boolean;
}

export type SafeFetchResult<T> = SafeFetchSuccess<T> | SafeFetchFailure;

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  if (error && typeof error === "object" && "name" in error) {
    const name = String((error as { name?: string }).name);
    if (name === "AbortError") return true;
  }
  return false;
}

function toFriendlyNetworkError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("networkerror") ||
      message.includes("failed to fetch") ||
      message.includes("load failed") ||
      message.includes("network request failed")
    ) {
      return "No se pudo conectar con el servidor. Verifica que esté encendido y que CORS esté habilitado.";
    }
    return error.message;
  }
  return "Ocurrió un error de red inesperado.";
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const raw = await res.text();
    if (!raw) return `Error ${res.status} ${res.statusText}`.trim();

    try {
      const data = JSON.parse(raw) as {
        message?: string | string[];
        error?: string;
        cause?: { code?: string; message?: string; detail?: string };
      };
      const parts = [
        Array.isArray(data.message) ? data.message.join(". ") : data.message,
        data.error,
        data.cause?.code,
        data.cause?.message,
        data.cause?.detail,
      ].filter((part): part is string => typeof part === "string" && part.length > 0);

      if (parts.length > 0) return parts.join(" | ");
    } catch {
      return raw;
    }

    return raw;
  } catch {
    // Sin cuerpo.
  }
  return `Error ${res.status} ${res.statusText}`.trim();
}

export async function safeFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(input, {
      cache: "no-store",
      ...init,
    });

    if (!res.ok) {
      return { ok: false, error: await readErrorMessage(res), aborted: false };
    }

    try {
      const data = (await res.json()) as T;
      return { ok: true, data };
    } catch {
      return {
        ok: false,
        error: "La respuesta del servidor no es un JSON válido.",
        aborted: false,
      };
    }
  } catch (error: unknown) {
    if (isAbortError(error, init?.signal ?? undefined)) {
      return { ok: false, error: "", aborted: true };
    }
    return {
      ok: false,
      error: toFriendlyNetworkError(error),
      aborted: false,
    };
  }
}
