import { Suspense } from "react";
import { AccountLayout } from "@/components/account/AccountLayout";
import OrdersClient from "./OrdersClient";

export const instant = false;

export const metadata = { title: "My Orders" };

export default function OrdersPage() {
  return (
    <AccountLayout>
      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-[8px] bg-tile" aria-hidden="true" />
        }
      >
        <OrdersClient />
      </Suspense>
    </AccountLayout>
  );
}