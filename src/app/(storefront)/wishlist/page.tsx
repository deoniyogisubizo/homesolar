import Link from "next/link";
import { WishlistView } from "@/components/wishlist/WishlistView";

export const metadata = {
  title: "Your wishlist",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return (
    <div className="container-page py-6 sm:py-10">
      <nav className="flex items-center gap-2 text-[11px] text-muted">
        <Link href="/" className="hover:text-navy">Home</Link>
        <span>/</span>
        <span className="text-navy">Wishlist</span>
      </nav>
      <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.03em] text-ink sm:mt-7 sm:text-[34px]">My wishlist</h1>
      <div className="mt-8">
        <WishlistView />
      </div>
    </div>
  );
}
