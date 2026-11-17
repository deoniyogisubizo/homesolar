import Image from "next/image";
import Link from "next/link";
import type { SiteContentData } from "@/types";

export function Clients({ clients }: { clients: SiteContentData["clients"] }) {
  return (
    <section className="pt-10 pb-16 lg:pt-[53px] lg:pb-[111px]">
      <div className="container-page">
        <h2 className="text-center text-[27px] font-semibold tracking-[-0.02em] text-ink lg:text-[29px]">
          {clients.title}
        </h2>
        <div className="mt-8 flex flex-wrap sm:mt-[50px] items-center justify-center gap-x-9 gap-y-6 lg:gap-x-[44px]">
          {clients.logos.map((logo) => (
            <Link
              key={logo.name}
              href={logo.href}
              className="flex h-[55px] items-center justify-center opacity-75 transition-opacity hover:opacity-100"
              aria-label={logo.name}
            >
              <Image
                src={logo.image}
                alt={logo.name}
                width={354}
                height={186}
                className="h-[36px] w-auto object-contain sm:h-[46px]"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
