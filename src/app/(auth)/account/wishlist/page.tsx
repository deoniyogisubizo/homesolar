import { getCustomerWishlist } from "@/app/(auth)/actions/dashboard-actions";
import { AccountLayout } from "@/components/account/AccountLayout";
import WishlistItems from "./WishlistItems";

export const instant = false;

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const wishlistResponse = await getCustomerWishlist();

  return (
    <AccountLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-ink">Wishlist</h1>
            <p className="mt-1 text-muted">Your saved products ({wishlistResponse.ok ? wishlistResponse.data.items.length : 0})</p>
          </div>
        </div>

        <WishlistItems items={wishlistResponse.ok ? wishlistResponse.data.items : []} currencySymbol={wishlistResponse.ok ? wishlistResponse.data.currencySymbol : "RWF"} />
      </div>
    </AccountLayout>
  );
}