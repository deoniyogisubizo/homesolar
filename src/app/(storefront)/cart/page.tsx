import Link from "next/link";
import { CartView } from "@/components/cart/CartView";
import { getSetting } from "@/lib/admin/settings";
import { readSessionId } from "@/lib/session";
import { getCart } from "@/lib/store";
import { getWhatsAppNumber } from "@/lib/whatsapp";
import type { CartResponse } from "@/types";

export const instant = false;

export const metadata = {
  title: "Your cart",
};

const emptyCart: CartResponse = {
  items: [],
  count: 0,
  subtotal: 0,
  campaignDiscount: 0,
  couponDiscount: 0,
  shipping: 0,
  tax: 0,
  total: 0,
  freeShipping: false,
  shippingPending: true,
  coupon: null,
};

export default async function CartPage() {
  const sessionId = await readSessionId();
  const [initialCart, contact, whatsappOrder, whatsappNumber] = await Promise.all([
    sessionId ? getCart(sessionId) : Promise.resolve(emptyCart),
    getSetting("contact"),
    getSetting("whatsappOrder"),
    getWhatsAppNumber(),
  ]);

  return (
    <div className="container-page py-6 sm:py-10">
      <nav className="flex items-center gap-2 text-[11px] text-muted">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>
        <span>/</span>
        <span className="text-navy">Cart</span>
      </nav>
      <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.03em] text-ink sm:mt-7 sm:text-[34px]">
        Shopping cart
      </h1>
      <div className="mt-8">
        <CartView
          initialCart={initialCart}
          orderingAvailable={Boolean(whatsappNumber)}
          helperText={whatsappOrder.cartHelperText}
          supportEmail={contact.supportEmail}
          supportPhone={contact.primaryPhone}
        />
      </div>
    </div>
  );
}
