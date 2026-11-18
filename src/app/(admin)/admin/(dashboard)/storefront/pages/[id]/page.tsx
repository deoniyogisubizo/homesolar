import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { PageEditor, type PageFormValues } from "@/components/admin/content/PageEditor";
import { guardPage } from "@/lib/admin/page-guard";
import { connectToDatabase } from "@/lib/mongodb";
import { Page } from "@/models/Page";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("pages:write");
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectToDatabase();
  const page = await Page.findById(id).lean();
  if (!page) notFound();

  const initial: PageFormValues = {
    id: String(page._id),
    title: page.title,
    slug: page.slug,
    excerpt: page.excerpt,
    content: page.content,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    noindex: page.noindex ?? false,
    faqs: (page.faqs ?? []).map((faq) => ({ question: faq.question, answer: faq.answer })),
    status: page.status,
    showInFooter: page.showInFooter,
    order: page.order,
  };

  return (
    <>
      <PageHeader
        title={page.title}
        description={`Editing /${page.slug}. Saved changes publish to the storefront immediately when the page is published.`}
        breadcrumbs={[{ label: "Storefront" }, { label: "Pages", href: "/admin/storefront/pages" }, { label: page.title }]}
      />
      <PageBody>
        <PageEditor initial={initial} />
      </PageBody>
    </>
  );
}
