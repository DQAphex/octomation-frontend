import type { Metadata } from "next";

import BillingView from "@/components/billing/BillingView";

export const metadata: Metadata = {
  title: "Suscripción y Facturación · OCTOMATION",
};

export default function BillingPage() {
  return <BillingView />;
}
