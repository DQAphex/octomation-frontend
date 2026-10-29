import { safeFetchJson } from "@/lib/api/safe-fetch";
import { TENANTS_URL } from "@/lib/api/tenants";

export const DEMO_IAM_USER_ID = "demo_user_iam_123";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEMO_IAM_USER_UUID = "123e4567-e89b-12d3-a456-426614174123";

export interface CreateWorkspaceMemberPayload {
  userId: string;
  tenantId: string;
  role?: string;
}

export async function createWorkspaceMember(
  payload: CreateWorkspaceMemberPayload,
) {
  const iamUserId = UUID_RE.test(payload.userId)
    ? payload.userId
    : DEMO_IAM_USER_UUID;

  return safeFetchJson<unknown>(`${TENANTS_URL}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: payload.userId,
      iamUserId,
      tenantId: payload.tenantId,
      role: payload.role ?? "MEMBER",
    }),
  });
}
