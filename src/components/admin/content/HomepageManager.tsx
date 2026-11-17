import { HeaderEditor, HeroEditor } from "@/components/admin/content/HeaderHeroEditors";
import {
  CategoriesHeadingEditor,
  ClientsEditor,
  MeetEditor,
  ProductSectionEditor,
  PromosEditor,
  SaleEditor,
  SectionOrderEditor,
} from "@/components/admin/content/HomepageSectionEditors";
import type { ProductOption } from "@/components/admin/content/ProductPicker";
import type { SiteContentData } from "@/types";

const items = [
  { id: "header", label: "Header options" },
  { id: "hero", label: "Hero banners" },
  { id: "sale", label: "Sale strip" },
  { id: "promos", label: "Promo banners" },
  { id: "categories", label: "Categories heading" },
  { id: "best-selling", label: "Best selling" },
  { id: "featured", label: "Featured products" },
  { id: "meet", label: "Meet us and newsletter" },
  { id: "clients", label: "Client logos" },
  { id: "order", label: "Section order" },
];

export function HomepageManager({
  content,
  bestSellingOptions,
  featuredOptions,
}: {
  content: SiteContentData;
  bestSellingOptions: ProductOption[];
  featuredOptions: ProductOption[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Homepage sections" className="hidden xl:block">
        <div className="sticky top-[84px]">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">On this page</p>
          <ul className="mt-2 space-y-0.5 border-l border-admin-line">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="-ml-px block border-l border-transparent px-3 py-1.5 text-[12px] text-admin-muted hover:border-brand hover:text-ink"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-[6px] border border-admin-line bg-white p-3 text-[11px] leading-5 text-admin-muted">
            Changes publish to the storefront as soon as each block is saved. Use Preview to check the live page.
          </p>
        </div>
      </nav>

      <div className="min-w-0 space-y-10">
        <section id="header" className="scroll-mt-[80px]">
          <HeaderEditor initial={content.header} />
        </section>
        <section id="hero" className="scroll-mt-[80px]">
          <HeroEditor initial={content.hero} />
        </section>
        <section id="sale" className="scroll-mt-[80px]">
          <SaleEditor initial={content.sale} />
        </section>
        <section id="promos" className="scroll-mt-[80px]">
          <PromosEditor initial={content.promos} />
        </section>
        <section id="categories" className="scroll-mt-[80px]">
          <CategoriesHeadingEditor initial={content.categories} />
        </section>
        <section id="best-selling" className="scroll-mt-[80px]">
          <ProductSectionEditor
            section="bestSelling"
            number={5}
            title="Best selling products"
            description="Product grid and side banner for the best-selling block."
            initial={content.bestSelling}
            initialOptions={bestSellingOptions}
          />
        </section>
        <section id="featured" className="scroll-mt-[80px]">
          <ProductSectionEditor
            section="featured"
            number={6}
            title="Featured products"
            description="Product grid and side banner for the featured block."
            initial={content.featured}
            initialOptions={featuredOptions}
          />
        </section>
        <section id="meet" className="scroll-mt-[80px]">
          <MeetEditor initial={content.meet} />
        </section>
        <section id="clients" className="scroll-mt-[80px]">
          <ClientsEditor initial={content.clients} />
        </section>
        <section id="order" className="scroll-mt-[80px]">
          <SectionOrderEditor initial={content.sectionOrder} />
        </section>
      </div>
    </div>
  );
}
