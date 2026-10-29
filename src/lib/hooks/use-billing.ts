"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createTenantSubscription,
  fetchTenantSubscription,
} from "@/lib/api/billing";
import { getCurrentTenantId } from "@/lib/api/tenants";
import type { BillingPlan, Subscription } from "@/types";

export function useBilling() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const currentTenantId = getCurrentTenantId();
    setTenantId(currentTenantId);
    setIsLoading(true);
    setError(null);

    if (!currentTenantId) {
      setSubscription(null);
      setError("No hay un tenant seleccionado. Inicia sesión de nuevo.");
      setIsLoading(false);
      return;
    }

    try {
      const subscriptionResult = await fetchTenantSubscription(
        currentTenantId,
        signal,
      );

      if (signal?.aborted) return;

      if (!subscriptionResult.ok) {
        if (subscriptionResult.aborted) return;
        setSubscription(null);
        setError(subscriptionResult.error);
        return;
      }

      if (!subscriptionResult.data) {
        setSubscription(null);
        setError("Este tenant no tiene una suscripción activa.");
        return;
      }

      setSubscription(subscriptionResult.data);
      setError(null);
    } catch (err: unknown) {
      if (signal?.aborted) return;
      setSubscription(null);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la facturación",
      );
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function upgradeToPlan(plan: BillingPlan) {
    const currentTenantId = tenantId ?? getCurrentTenantId();
    if (!currentTenantId) {
      setError("No hay un tenant seleccionado. Inicia sesión de nuevo.");
      return;
    }

    const result = await createTenantSubscription(currentTenantId, plan.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    await load();
  }

  return {
    subscription,
    isLoading,
    error,
    tenantId,
    refresh: load,
    upgradeToPlan,
  };
}
