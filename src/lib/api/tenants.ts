import { listIamUsers, type ApiIamUser } from "@/lib/api/iam";
import { safeFetchJson, type SafeFetchResult } from "@/lib/api/safe-fetch";
import type { Member, MemberStatus, UserRole } from "@/types";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";

export const TENANTS_URL =
  process.env.NEXT_PUBLIC_TENANTS_URL ?? "http://localhost:4004";

export const WORKSPACE_ID_KEY = "current_workspace_id";
export const TENANT_ID_KEY = "current_tenant_id";
export const WORKSPACE_CHANGED_EVENT = "octomation:workspace-changed";

export interface ApiWorkspace {
  workspaceId: string;
  tenantId: string;
  workspaceNombre: string;
  maxMemberLimitId: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface ApiWorkspaceMember {
  memberId: string;
  workspaceId: string;
  status?: string;
  createdAt?: string;
}

export interface ApiMemberProfile {
  memberId?: string;
  name?: string;
  lastname?: string;
  iamUserId?: string;
  tenantId?: string;
  status?: string;
}

export interface ApiWorkspaceInvitation {
  invitationId: string;
  receiverId?: string;
  senderId?: string;
  workspaceId?: string;
  status?: string;
  name?: string;
  lastname?: string;
  iamUserId?: string;
  email?: string;
}

export function getSessionAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window === "undefined") return headers;

  const token = localStorage.getItem("token");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function withAuth(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      ...getSessionAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  };
}

export function getCurrentWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(WORKSPACE_ID_KEY);
}

export function getCurrentTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TENANT_ID_KEY);
}

export function setCurrentWorkspaceId(
  workspaceId: string,
  options?: { silent?: boolean; tenantId?: string },
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WORKSPACE_ID_KEY, workspaceId);
  if (options?.tenantId) {
    localStorage.setItem(TENANT_ID_KEY, options.tenantId);
  }
  if (!options?.silent) {
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_CHANGED_EVENT, { detail: workspaceId }),
    );
  }
}

export function filterWorkspacesForSession(
  items: ApiWorkspace[],
): ApiWorkspace[] {
  const tenantId = getCurrentTenantId();
  if (!tenantId) return items;
  return items.filter((workspace) => workspace.tenantId === tenantId);
}

export async function listWorkspaces(signal?: AbortSignal) {
  return safeFetchJson<ApiWorkspace[] | { data: ApiWorkspace[] }>(
    `${TENANTS_URL}/workspaces?page=1&limit=50`,
    withAuth({ signal }),
  );
}

export function unwrapWorkspaces(
  body: ApiWorkspace[] | { data: ApiWorkspace[] } | undefined,
): ApiWorkspace[] {
  if (!body) return [];
  return Array.isArray(body) ? body : (body.data ?? []);
}

export function unwrapList<T>(body: T[] | { data: T[] } | undefined): T[] {
  if (!body) return [];
  return Array.isArray(body) ? body : (body.data ?? []);
}

export async function getWorkspace(
  workspaceId: string,
  signal?: AbortSignal,
) {
  return safeFetchJson<ApiWorkspace>(
    `${TENANTS_URL}/workspaces/${workspaceId}`,
    withAuth({ signal }),
  );
}

export async function deleteWorkspace(workspaceId: string) {
  return safeFetchJson<{ message?: string }>(
    `${TENANTS_URL}/workspaces/${workspaceId}`,
    withAuth({ method: "DELETE" }),
  );
}

export async function listWorkspaceMembers(
  workspaceId: string,
  signal?: AbortSignal,
) {
  return safeFetchJson<ApiWorkspaceMember[] | { data: ApiWorkspaceMember[] }>(
    `${TENANTS_URL}/workspaces/${workspaceId}/members`,
    withAuth({ signal }),
  );
}

export async function getMemberProfile(
  memberId: string,
  signal?: AbortSignal,
) {
  return safeFetchJson<ApiMemberProfile>(
    `${TENANTS_URL}/members/data/${memberId}`,
    withAuth({ signal }),
  );
}

export async function listWorkspaceInvitations(
  workspaceId: string,
  signal?: AbortSignal,
) {
  return safeFetchJson<
    ApiWorkspaceInvitation[] | { data: ApiWorkspaceInvitation[] }
  >(`${TENANTS_URL}/workspaces/${workspaceId}/invitations`, withAuth({ signal }));
}

export function toUiMemberStatus(status?: string | null): MemberStatus {
  const value = (status ?? "").trim().toLowerCase();
  if (value === "active" || value === "activo") return "ACTIVE";
  return "PENDING";
}

function toUiRole(role?: string | null): UserRole {
  const value = (role ?? "").trim().toUpperCase();
  if (value === "SUPER_ADMIN" || value === "TENANT_ADMIN" || value === "MEMBER") {
    return value;
  }
  return "MEMBER";
}

export function mapWorkspaceMember(
  row: ApiWorkspaceMember,
  profile?: ApiMemberProfile | null,
  session?: SessionUser | null,
  iamUser?: ApiIamUser | null,
): Member {
  const fullName = [profile?.name, profile?.lastname]
    .filter(Boolean)
    .join(" ")
    .trim();
  const isCurrentUser =
    Boolean(session?.id) &&
    Boolean(profile?.iamUserId) &&
    session?.id === profile?.iamUserId;

  return {
    id: row.memberId,
    name: fullName || iamUser?.fullName || "Miembro",
    email:
      iamUser?.email ||
      (isCurrentUser ? (session?.email ?? "") : ""),
    role: isCurrentUser ? toUiRole(session?.role) : "MEMBER",
    status: toUiMemberStatus(row.status ?? profile?.status),
  };
}

export function mapInvitationToMember(
  invitation: ApiWorkspaceInvitation,
  iamUser?: ApiIamUser | null,
): Member {
  const fullName = [invitation.name, invitation.lastname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: invitation.invitationId || invitation.receiverId || `invite-${invitation.email ?? "pending"}`,
    name: fullName || iamUser?.fullName || iamUser?.email || "Invitado",
    email: iamUser?.email || invitation.email || "",
    role: "MEMBER",
    status: "PENDING",
  };
}

function isPendingInvitation(status?: string | null): boolean {
  const value = (status ?? "PENDING").trim().toUpperCase();
  return value === "PENDING" || value === "PENDIENTE";
}

export async function fetchWorkspaceMembers(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<SafeFetchResult<Member[]>> {
  const [membersResult, invitationsResult, iamResult] = await Promise.all([
    listWorkspaceMembers(workspaceId, signal),
    listWorkspaceInvitations(workspaceId, signal),
    listIamUsers(signal),
  ]);

  if (signal?.aborted) {
    return { ok: false, error: "", aborted: true };
  }

  if (!membersResult.ok && !invitationsResult.ok) {
    return membersResult;
  }

  const session = getSessionUser();
  const iamUsers = iamResult.ok ? unwrapList(iamResult.data) : [];
  const iamById = new Map(
    iamUsers
      .filter((user) => typeof user.id === "string")
      .map((user) => [user.id, user]),
  );

  const memberRows = membersResult.ok ? unwrapList(membersResult.data) : [];
  const members = await Promise.all(
    memberRows.map(async (row) => {
      const profile = await getMemberProfile(row.memberId, signal);
      const data = profile.ok ? profile.data : null;
      const iamUser = data?.iamUserId ? iamById.get(data.iamUserId) : undefined;
      return mapWorkspaceMember(row, data, session, iamUser);
    }),
  );

  if (signal?.aborted) {
    return { ok: false, error: "", aborted: true };
  }

  const memberIds = new Set(members.map((member) => member.id));
  const invitationRows = invitationsResult.ok
    ? unwrapList(invitationsResult.data)
    : [];

  const pending = invitationRows
    .filter((invitation) => isPendingInvitation(invitation.status))
    .filter(
      (invitation) =>
        !invitation.receiverId || !memberIds.has(invitation.receiverId),
    )
    .map((invitation) => {
      const iamUser = invitation.iamUserId
        ? iamById.get(invitation.iamUserId)
        : undefined;
      return mapInvitationToMember(invitation, iamUser);
    });

  return { ok: true, data: [...members, ...pending] };
}

export interface CreateInvitationPayload {
  email: string;
  workspaceId: string;
}

export async function createWorkspaceInvitation(
  payload: CreateInvitationPayload,
) {
  const token =
    typeof window === "undefined" ? null : localStorage.getItem("token");

  return safeFetchJson<unknown>(`${TENANTS_URL}/workspaces/invitations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      email: payload.email,
      workspaceId: payload.workspaceId,
    }),
  });
}

function bearerHeaders(): HeadersInit {
  const token =
    typeof window === "undefined" ? null : localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function deleteWorkspaceInvitation(invitationId: string) {
  return safeFetchJson<{ message?: string }>(
    `${TENANTS_URL}/workspaces/invitations/${invitationId}`,
    {
      method: "DELETE",
      headers: bearerHeaders(),
    },
  );
}

export async function deleteWorkspaceMember(
  workspaceId: string,
  memberId: string,
) {
  return safeFetchJson<{ message?: string }>(
    `${TENANTS_URL}/workspaces/${workspaceId}/members/${memberId}`,
    {
      method: "DELETE",
      headers: bearerHeaders(),
    },
  );
}

export async function removeMemberOrInvitation(
  member: Member,
  workspaceId: string,
) {
  if (member.status !== "ACTIVE") {
    return deleteWorkspaceInvitation(member.id);
  }

  return deleteWorkspaceMember(workspaceId, member.id);
}
