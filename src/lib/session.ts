"use client";

import { useSyncExternalStore } from "react";
import type { UserRole } from "@/types";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  tenantId?: string;
  workspaceName?: string;
}

const userRoles: UserRole[] = ["SUPER_ADMIN", "TENANT_ADMIN", "MEMBER"];
const SESSION_UPDATED_EVENT = "octomation-session-updated";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSessionUser(serializedUser: string | null): SessionUser | null {
  try {
    const storedUser: unknown = JSON.parse(serializedUser ?? "null");

    if (
      !isRecord(storedUser) ||
      typeof storedUser.id !== "string" ||
      typeof storedUser.email !== "string"
    ) {
      return null;
    }

    const name =
      typeof storedUser.name === "string"
        ? storedUser.name
        : typeof storedUser.fullName === "string"
          ? storedUser.fullName
          : null;

    if (!name) {
      return null;
    }

    const role = userRoles.find((candidate) => candidate === storedUser.role);

    return {
      id: storedUser.id,
      name,
      email: storedUser.email,
      ...(role ? { role } : {}),
      ...(typeof storedUser.tenantId === "string"
        ? { tenantId: storedUser.tenantId }
        : {}),
      ...(typeof storedUser.workspaceName === "string"
        ? { workspaceName: storedUser.workspaceName }
        : {}),
    };
  } catch {
    return null;
  }
}

function getStoredUser(): string | null {
  return localStorage.getItem("user");
}

function subscribeToSession(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_UPDATED_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_UPDATED_EVENT, callback);
  };
}

export function readSessionUser(): SessionUser | null {
  return parseSessionUser(getStoredUser());
}

export function notifySessionUpdated(): void {
  window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
}

export function useSessionUser(): SessionUser | null {
  const serializedUser = useSyncExternalStore(
    subscribeToSession,
    getStoredUser,
    () => null,
  );
  return parseSessionUser(serializedUser);
}
