import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";
import { Media } from "@/models/Media";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  if (!can(session.role, "media:read")) {
    return NextResponse.json({ ok: false, error: "Your role does not allow this action." }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") ?? "36", 10) || 36, 1), 72);
  const folder = (url.searchParams.get("folder") ?? "").trim();

  await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (query) {
    const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ originalName: pattern }, { alt: pattern }, { tags: pattern }];
  }
  if (folder) filter.folder = folder;

  const items = await Media.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

  return NextResponse.json({
    ok: true,
    data: {
      items: items.map((item) => ({
        id: String(item._id),
        url: item.url,
        thumbUrl: item.thumbUrl ?? null,
        alt: item.alt,
        originalName: item.originalName,
        folder: item.folder,
        width: item.width ?? null,
        height: item.height ?? null,
        size: item.size,
        createdAt: item.createdAt?.toISOString() ?? null,
      })),
    },
  });
}
