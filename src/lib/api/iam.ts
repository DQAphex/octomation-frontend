import { safeFetchJson } from "@/lib/api/safe-fetch";

export const IAM_URL =
  process.env.NEXT_PUBLIC_IAM_URL ?? "http://localhost:4002";

export interface ApiIamUser {
  id: string;
  email?: string;
  fullName?: string;
}

export async function listIamUsers(signal?: AbortSignal) {
  const token =
    typeof window === "undefined" ? null : localStorage.getItem("token");

  return safeFetchJson<ApiIamUser[] | { data: ApiIamUser[] }>(
    `${IAM_URL}/iam/users`,
    {
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
}
