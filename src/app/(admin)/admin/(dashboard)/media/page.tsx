import { PageBody, PageHeader } from "@/components/admin/PageHeader";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { guardPage } from "@/lib/admin/page-guard";
import { can } from "@/lib/admin/permissions";
import { connectToDatabase } from "@/lib/mongodb";
import { Media } from "@/models/Media";

export const metadata = { title: "Media library" };

export default async function MediaPage() {
  const session = await guardPage("media:read");
  await connectToDatabase();
  const items = await Media.find({}).sort({ createdAt: -1 }).limit(24).lean();

  return (
    <>
      <PageHeader
        title="Media library"
        description="Upload, organise and reuse storefront images. Used images cannot be deleted."
        breadcrumbs={[{ label: "Storefront" }, { label: "Media library" }]}
      />
      <PageBody>
        <MediaLibrary
          canWrite={can(session.role, "media:write")}
          initialItems={items.map((item) => ({
            id: String(item._id),
            url: item.url,
            thumbUrl: item.thumbUrl ?? null,
            alt: item.alt,
            originalName: item.originalName,
            folder: item.folder,
            tags: item.tags,
            size: item.size,
            width: item.width ?? null,
            height: item.height ?? null,
            createdAt: item.createdAt?.toISOString() ?? null,
          }))}
        />
      </PageBody>
    </>
  );
}
