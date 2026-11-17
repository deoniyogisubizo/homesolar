import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { getSetting } from "@/lib/admin/settings";
import { getCustomerSession } from "@/lib/auth/customer";
import { getDeliveryLocations } from "@/lib/locations";
import { readSessionId } from "@/lib/session";
import { loadCartQuote } from "@/lib/store";
import { getWhatsAppNumber } from "@/lib/whatsapp";

export const instant = false;

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const sessionId = await readSessionId();
  if (!sessionId) redirect("/cart");

  const [cart, contact, whatsappOrder, locations, customer, whatsappNumber] = await Promise.all([
    loadCartQuote(sessionId),
    getSetting("contact"),
    getSetting("whatsappOrder"),
    getDeliveryLocations(),
    getCustomerSession(),
    getWhatsAppNumber(),
  ]);

  if (!cart.items.length) redirect("/cart");
  if (cart.hasUnavailable || cart.hasStockIssue) redirect("/cart");

  return (
    <div className="container-page py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] text-muted">
        <Link href="/" className="transition-colors hover:text-navy">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/cart" className="transition-colors hover:text-navy">
          Cart
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-navy">Checkout</span>
      </nav>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[34px]">
            Checkout
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            Confirm your details, then continue the conversation on WhatsApp.
          </p>
        </div>
        <Link href="/cart" className="text-[12px] text-muted underline underline-offset-2 hover:text-ink">
          Back to cart
        </Link>
      </div>
      <div className="mt-8">
        <CheckoutView
          initialCart={cart}
          locations={locations}
          customer={
            customer
              ? { name: customer.name, email: customer.email, phone: customer.phone }
              : null
          }
          orderingAvailable={Boolean(whatsappNumber)}
          helperText={whatsappOrder.checkoutHelperText}
          supportEmail={contact.supportEmail}
          supportPhone={contact.primaryPhone}
        />
      </div>
    </div>
  );
}
