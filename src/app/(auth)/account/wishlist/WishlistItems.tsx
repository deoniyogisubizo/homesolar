"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Trash2, Loader2, ShoppingBag, Plus } from "lucide-react";
import { removeFromWishlist } from "@/app/(auth)/actions/dashboard-actions";

type WishlistItem = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  originalPrice?: number;
  stock: number;
  status: string;
};

export default function WishlistItems({
  items,
  currencySymbol,
}: {
  items: WishlistItem[];
  currencySymbol: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);

  function formatMoney(value: number) {
    return `${currencySymbol} ${value.toLocaleString("en-US")}`;
  }

  function handleRemove(productId: string) {
    setRemoving(productId);
    startTransition(async () => {
      const response = await removeFromWishlist(productId);
      if (!response.ok) {
        window.alert(response.error);
      } else {
        router.refresh();
      }
      setRemoving(null);
    });
  }

  return (
    <div className="rounded-[12px] border border-line bg-white overflow-hidden">
      {items.length === 0 ? (
        <div className="p-12 text-center">
          <Heart className="h-12 w-12 mx-auto text-muted mb-4" />
          <h3 className="text-[18px] font-semibold text-ink mb-2">Your wishlist is empty</h3>
          <p className="text-muted mb-6">Save products you love for later</p>
          <Link href="/search" className="inline-flex items-center gap-2 rounded-[6px] bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep">
            <ShoppingBag className="h-4 w-4" />
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {items.map((item) => (
            <div key={item.id} className="p-4 flex gap-4 hover:bg-tile/50 transition-colors">
              <Link href={`/product/${item.slug}`} className="w-20 h-20 rounded-[8px] bg-tile flex-shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- product images are remote and unoptimized */}
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/product/${item.slug}`} className="font-medium text-ink hover:text-brand line-clamp-2">
                  {item.name}
                </Link>
                <p className="text-sm text-muted mt-1">{formatMoney(item.price)}</p>
                {item.originalPrice && item.originalPrice > item.price && (
                  <p className="text-sm line-through text-muted mt-0.5">{formatMoney(item.originalPrice)}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs rounded-[4px] px-1.5 py-0.5 ${
                    item.status === "in_stock" ? "bg-success/10 text-success" :
                    item.status === "low_stock" ? "bg-warning/10 text-warning" :
                    "bg-danger/10 text-danger"
                  }`}>
                    {item.status === "in_stock" && "In Stock"}
                    {item.status === "low_stock" && `Low Stock (${item.stock})`}
                    {item.status === "out_of_stock" && "Out of Stock"}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Link
                  href={`/product/${item.slug}`}
                  className="p-2 rounded-[6px] border border-line bg-white text-muted hover:bg-tile hover:text-ink transition-colors"
                  aria-label="View product"
                >
                  <Plus className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleRemove(item.productId)}
                  disabled={pending || removing === item.productId}
                  className="p-2 rounded-[6px] border border-danger/30 bg-danger-pale text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                  aria-label="Remove from wishlist"
                >
                  {removing === item.productId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}