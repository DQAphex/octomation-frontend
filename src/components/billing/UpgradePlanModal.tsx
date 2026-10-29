"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle, Sparkles } from "lucide-react";

import { fetchBillingPlans } from "@/lib/api/billing";
import type { BillingPlan } from "@/types";

interface UpgradePlanModalProps {
  currentPlanId?: string;
  currentPlanName?: string;
  onClose: () => void;
  onSelect: (plan: BillingPlan) => void;
}

const priceFormat = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "USD",
});

function uniqueFromApi(plans: BillingPlan[]): BillingPlan[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  return plans.filter((plan) => {
    const nameKey = plan.name.trim().toLowerCase();
    if (!plan.id || seenIds.has(plan.id) || seenNames.has(nameKey)) {
      return false;
    }
    seenIds.add(plan.id);
    seenNames.add(nameKey);
    return true;
  });
}

export default function UpgradePlanModal({
  currentPlanId,
  currentPlanName,
  onClose,
  onSelect,
}: UpgradePlanModalProps) {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      setIsLoading(true);
      setError(null);
      const result = await fetchBillingPlans(controller.signal);
      if (controller.signal.aborted || result.aborted) return;

      if (!result.ok) {
        setPlans([]);
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setPlans(uniqueFromApi(result.data));
      setIsLoading(false);
    })();

    return () => controller.abort();
  }, []);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <dialog
        open
        aria-labelledby="upgrade-plan-title"
        className="m-0 w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-octo-900 text-zinc-100 shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-400" />
            <h3
              id="upgrade-plan-title"
              className="text-lg font-semibold tracking-tight"
            >
              Mejorar Plan
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-sm text-zinc-400">
            Elige el plan que mejor se ajuste al consumo de tu workspace.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400">
              <LoaderCircle className="size-4 animate-spin text-violet-400" />
              Cargando planes...
            </div>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : plans.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No hay planes disponibles en el catálogo.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent =
                  (currentPlanId && plan.id === currentPlanId) ||
                  (!!currentPlanName &&
                    plan.name.toLowerCase() === currentPlanName.toLowerCase());

                return (
                  <article
                    key={plan.id}
                    className={`flex flex-col rounded-2xl border p-5 ${
                      isCurrent
                        ? "border-violet-500/40 bg-violet-600/10 shadow-lg shadow-violet-600/10"
                        : "border-white/10 bg-octo-950/50"
                    }`}
                  >
                    <p className="text-sm text-zinc-400">{plan.displayName}</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-100">
                      {priceFormat.format(plan.price)}
                      <span className="ml-1 text-sm font-medium text-zinc-500">
                        / mes
                      </span>
                    </p>
                    <p className="mt-2 text-sm text-zinc-400">
                      {plan.description}
                    </p>

                    <ul className="mt-5 space-y-2 text-sm text-zinc-300">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-violet-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      disabled={Boolean(isCurrent)}
                      onClick={() => onSelect(plan)}
                      className={`mt-6 inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors ${
                        isCurrent
                          ? "cursor-not-allowed border border-octo-700 bg-octo-950/60 text-zinc-500"
                          : "bg-violet-600 text-white shadow-lg shadow-violet-600/25 hover:bg-violet-500"
                      }`}
                    >
                      {isCurrent ? "Plan actual" : `Elegir ${plan.displayName}`}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
