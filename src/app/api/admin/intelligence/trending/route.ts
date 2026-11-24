import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { PopularityScore } from "@/models/PopularityScore";
import { getAdminSession } from "@/lib/admin/auth";
import { can } from "@/lib/admin/permissions";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "reports:read")) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  try {
    await connectToDatabase();

    const trending = await Product.aggregate<{
      _id: Types.ObjectId;
      name: string;
      score: number;
      category: { name: string };
      stock: number;
    }>([
      { $match: { publishStatus: "active" } },
      {
        $lookup: {
          from: "popularityscores",
          localField: "_id",
          foreignField: "productId",
          as: "pop",
        },
      },
      { $unwind: { path: "$pop", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
      { $addFields: { score: { $ifNull: ["$pop.score", 0] } } },
      { $sort: { score: -1 } },
      { $limit: 50 },
      { $project: { name: 1, score: 1, category: "$cat.name", stock: 1, _id: 1 } },
    ]).exec();

    return NextResponse.json({ ok: true, products: trending });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch trending" }, { status: 500 });
  }
}