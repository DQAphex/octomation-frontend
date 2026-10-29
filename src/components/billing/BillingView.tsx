"use client";

import { useState } from "react";
import {
  CalendarClock,
  CreditCard,
  Download,
  Sparkles,
  CircleX,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

import UpgradePlanModal from "@/components/billing/UpgradePlanModal";
import {
  MOCK_INVOICES,
  downloadInvoiceReceipt,
} from "@/lib/api/billing";
import { useBilling } from "@/lib/hooks/use-billing";
import type { BillingPlan, Invoice, SubscriptionStatus } from "@/types";

const statusLabels: Record<SubscriptionStatus, string> = {
  ACTIVE: "Activo",
  PAST_DUE: "Pago pendiente",
  CANCELED: "Cancelado",
};

const statusStyles: Record<SubscriptionStatus, string> = {
  ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  PAST_DUE: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  CANCELED: "border-red-500/30 bg-red-500/10 text-red-400",
};

const statusDotStyles: Record<SubscriptionStatus, string> = {
  ACTIVE: "bg-emerald-400",
  PAST_DUE: "bg-amber-400",
  CANCELED: "bg-red-400",
};

const dateFormat = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "long",
  timeZone: "UTC",
});
const shortDateFormat = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const priceFormat = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "USD",
});
const numberFormat = new Intl.NumberFormat("es-CL");

interface DetailProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function Detail({ icon: Icon, label, value }: DetailProps) {
  return (
    <div className="rounded-xl border border-octo-800 bg-octo-950/50 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function PaymentHistory({ invoices }: { invoices: Invoice[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-octo-900/60 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h3 className="text-sm font-medium text-zinc-100">
          Historial de Pagos
        </h3>
        <p className="text-xs text-zinc-500">
          {invoices.length}{" "}
          {invoices.length === 1 ? "comprobante" : "comprobantes"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-zinc-500">
              <th scope="col" className="px-6 py-3 font-medium">
                Fecha
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Monto
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Plan
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-right font-medium">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="transition-colors hover:bg-octo-800/40"
              >
                <td className="px-6 py-4 text-zinc-300">
                  {shortDateFormat.format(
                    new Date(`${invoice.date}T00:00:00Z`),
                  )}
                </td>
                <td className="px-6 py-4 font-medium text-zinc-100">
                  {priceFormat.format(invoice.amount)}
                </td>
                <td className="px-6 py-4 text-zinc-300">{invoice.planName}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    Pagado
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      aria-label={`Descargar factura del ${invoice.date}`}
                      onClick={() => downloadInvoiceReceipt(invoice)}
                      className="flex size-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-octo-800 hover:text-violet-300"
                    >
                      <Download className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-8">
      <header>
        <div className="h-8 w-72 animate-pulse rounded-lg bg-octo-800/80" />
        <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-octo-800/60" />
      </header>

      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-octo-900/60 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 animate-pulse rounded-xl bg-octo-800" />
            <div className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-octo-800" />
              <div className="h-7 w-40 animate-pulse rounded bg-octo-800" />
            </div>
          </div>
          <div className="h-8 w-24 animate-pulse rounded-full bg-octo-800" />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="h-24 animate-pulse rounded-xl bg-octo-800/70" />
          <div className="h-24 animate-pulse rounded-xl bg-octo-800/70" />
          <div className="h-24 animate-pulse rounded-xl bg-octo-800/70" />
        </div>
        <div className="mt-8 h-2.5 w-full animate-pulse rounded-full bg-octo-800" />
        <div className="mt-8 flex justify-end gap-3 border-t border-white/10 pt-6">
          <div className="h-11 w-44 animate-pulse rounded-lg bg-octo-800" />
          <div className="h-11 w-36 animate-pulse rounded-lg bg-octo-800" />
        </div>
      </section>
    </div>
  );
}

export default function BillingView() {
  const { subscription, isLoading, error, upgradeToPlan } = useBilling();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const invoices = MOCK_INVOICES;

  if (isLoading) {
    return <BillingSkeleton />;
  }

  const usagePercent = subscription
    ? Math.min(
        Math.round(
          subscription.maxAutomations > 0
            ? (subscription.usageAutomations / subscription.maxAutomations) *
              100
            : 0,
        ),
        100,
      )
    : 0;
  const renewal = subscription
    ? dateFormat.format(new Date(`${subscription.renewalDate}T00:00:00Z`))
    : "";
  const price = subscription ? priceFormat.format(subscription.price) : "";
  const planLabel = subscription?.planName;

  function handleSelectPlan(plan: BillingPlan) {
    void upgradeToPlan(plan);
    setIsUpgradeOpen(false);
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Suscripción y Facturación
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Revisa tu plan actual, el consumo del ciclo y gestiona tu
          suscripción.
        </p>
      </header>

      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-octo-900/60 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-violet-600/20 blur-3xl"
        />

        {subscription ? (
          <>
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/30">
                  <CreditCard className="size-6" />
                </span>
                <div>
                  <p className="text-sm text-zinc-400">Plan actual</p>
                  <h3 className="text-2xl font-semibold tracking-tight text-zinc-100">
                    Plan {planLabel}
                  </h3>
                </div>
              </div>

              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${statusStyles[subscription.status]}`}
              >
                <span
                  className={`size-2 rounded-full ${statusDotStyles[subscription.status]}`}
                />
                {statusLabels[subscription.status]}
              </span>
            </div>

            <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
              <Detail
                icon={Wallet}
                label="Precio mensual"
                value={`${price} / mes`}
              />
              <Detail
                icon={CalendarClock}
                label="Próxima renovación"
                value={renewal}
              />
              <Detail
                icon={Zap}
                label="Límite del plan"
                value={`${numberFormat.format(subscription.maxAutomations)} automatizaciones`}
              />
            </div>

            <div className="relative mt-8">
              <div className="flex items-center justify-between text-sm">
                <p className="text-zinc-300">
                  Has usado{" "}
                  <span className="font-semibold text-zinc-100">
                    {numberFormat.format(subscription.usageAutomations)}
                  </span>{" "}
                  de {numberFormat.format(subscription.maxAutomations)}{" "}
                  automatizaciones este mes
                </p>
                <span className="font-mono text-xs text-zinc-400">
                  {usagePercent}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={usagePercent}
                aria-label="Uso de automatizaciones"
                className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-octo-950"
              >
                <div
                  className="h-full rounded-full bg-linear-to-r from-violet-600 to-fuchsia-500"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="relative text-center text-sm text-red-400">
            {error ?? "No se encontró una suscripción activa."}
          </p>
        )}

        <div className="relative mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
          {subscription && (
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-octo-700 bg-octo-950/60 px-5 text-sm font-medium text-zinc-300 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
            >
              <CircleX className="size-4" />
              Cancelar Suscripción
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsUpgradeOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500"
          >
            <Sparkles className="size-4" />
            Mejorar Plan
          </button>
        </div>
      </section>

      <PaymentHistory invoices={invoices} />

      {isUpgradeOpen && (
        <UpgradePlanModal
          currentPlanId={subscription?.planId}
          currentPlanName={subscription?.planName}
          onClose={() => setIsUpgradeOpen(false)}
          onSelect={handleSelectPlan}
        />
      )}
    </div>
  );
}
