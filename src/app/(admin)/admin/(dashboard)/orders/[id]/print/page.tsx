import { redirect } from "next/navigation";

export const metadata = { title: "Print order" };

export default async function PrintOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ document?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const documentType = query.document === "packing-slip" ? "packing-slip" : "invoice";
  redirect(`/admin/orders/${encodeURIComponent(id)}/pdf?document=${encodeURIComponent(documentType)}`);
}
