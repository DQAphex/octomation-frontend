import { safeFetchJson, type SafeFetchResult } from "@/lib/api/safe-fetch";
import type {
  BillingPlan,
  Invoice,
  Subscription,
  SubscriptionStatus,
} from "@/types";

export const BILLING_URL =
  process.env.NEXT_PUBLIC_BILLING_URL ?? "http://localhost:4001";

export const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv_2026_10",
    date: "2026-10-15",
    amount: 49,
    planName: "Pro",
    status: "PAID",
  },
  {
    id: "inv_2026_09",
    date: "2026-09-15",
    amount: 49,
    planName: "Pro",
    status: "PAID",
  },
];

interface ApiPlan {
  id?: string;
  name?: string;
  price?: number | string;
  maxStorage?: number;
  maxExecutions?: number;
}

interface ApiSubscription {
  id?: string;
  tenantId?: string;
  status?: string;
  planId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  plan?: ApiPlan | null;
}

const numberFormat = new Intl.NumberFormat("es-CL");

function unwrapList<T>(payload: T[] | { data?: T[] } | null | undefined): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function toStatus(status?: string | null): SubscriptionStatus {
  const value = (status ?? "").trim().toUpperCase();
  if (value === "PAST_DUE" || value === "CANCELED" || value === "ACTIVE") {
    return value;
  }
  return "ACTIVE";
}

function toIsoDate(value?: string | null): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function toNumber(value: number | string | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapApiSubscription(row: ApiSubscription): Subscription {
  const plan = row.plan ?? {};
  const maxAutomations = toNumber(plan.maxExecutions, 0);

  return {
    id: row.id || "",
    planId: row.planId || plan.id,
    planName: plan.name?.trim() || "Plan",
    status: toStatus(row.status),
    price: toNumber(plan.price, 0),
    renewalDate: toIsoDate(row.currentPeriodEnd),
    usageAutomations: 0,
    maxAutomations,
  };
}

export function mapApiPlan(row: ApiPlan): BillingPlan {
  const name = row.name?.trim() || "Plan";
  const maxAutomations = toNumber(row.maxExecutions, 0);
  const maxStorage = toNumber(row.maxStorage, 0);
  const features = [
    maxAutomations > 0
      ? `${numberFormat.format(maxAutomations)} automatizaciones al mes`
      : "Automatizaciones según el plan",
    maxStorage > 0
      ? `${numberFormat.format(maxStorage)} MB de almacenamiento`
      : "Almacenamiento incluido",
    "Soporte del plan",
  ];

  return {
    id: row.id || name,
    name,
    displayName: name,
    price: toNumber(row.price, 0),
    maxAutomations,
    maxStorage,
    description: `Incluye hasta ${numberFormat.format(maxAutomations)} automatizaciones por ciclo.`,
    features,
  };
}

function pickCurrentSubscription(rows: ApiSubscription[]): ApiSubscription | null {
  if (rows.length === 0) return null;
  return (
    rows.find((row) => String(row.status ?? "").toUpperCase() === "ACTIVE") ??
    rows[0]
  );
}

export async function fetchTenantSubscription(
  tenantId: string,
  signal?: AbortSignal,
): Promise<SafeFetchResult<Subscription | null>> {
  const result = await safeFetchJson<
    ApiSubscription[] | { data: ApiSubscription[] }
  >(
    `${BILLING_URL}/subscriptions?tenantId=${encodeURIComponent(tenantId)}`,
    { signal },
  );

  if (!result.ok) return result;

  const current = pickCurrentSubscription(unwrapList(result.data));
  return {
    ok: true,
    data: current ? mapApiSubscription(current) : null,
  };
}

export async function fetchBillingPlans(
  signal?: AbortSignal,
): Promise<SafeFetchResult<BillingPlan[]>> {
  const result = await safeFetchJson<ApiPlan[] | { data: ApiPlan[] }>(
    `${BILLING_URL}/plans`,
    { signal },
  );

  if (!result.ok) return result;

  const seenIds = new Set<string>();
  const plans = unwrapList(result.data)
    .map(mapApiPlan)
    .filter((plan) => {
      if (!plan.id || seenIds.has(plan.id)) return false;
      seenIds.add(plan.id);
      return true;
    })
    .sort((left, right) => left.price - right.price);

  return { ok: true, data: plans };
}

export async function createTenantSubscription(
  tenantId: string,
  planId: string,
) {
  return safeFetchJson<ApiSubscription>(`${BILLING_URL}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId, planId }),
  });
}

export function downloadInvoiceReceipt(invoice: Invoice) {
  const date = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${invoice.date}T00:00:00Z`));
  const amount = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "USD",
  }).format(invoice.amount);

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Factura ${invoice.id}</title>
    <style>
      body { font-family: sans-serif; padding: 32px; color: #18181b; }
      h1 { font-size: 20px; }
      p { margin: 6px 0; }
    </style>
  </head>
  <body>
    <h1>OCTOMATION · Recibo de pago</h1>
    <p>Folio: ${invoice.id}</p>
    <p>Fecha: ${date}</p>
    <p>Plan: ${invoice.planName}</p>
    <p>Monto: ${amount}</p>
    <p>Estado: Pagado</p>
  </body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `factura-${invoice.id}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
