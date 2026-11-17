import { NextResponse } from "next/server";
import { cacheLife } from "next/cache";
import { BASE_CURRENCY, fetchMarketRates } from "@/lib/calculator";

async function getMarketRates() {
  "use cache";
  cacheLife("hours");
  return fetchMarketRates();
}

export async function GET() {
  const { rates, updatedAt, source } = await getMarketRates();

  return NextResponse.json(
    { base: BASE_CURRENCY, rates, updatedAt, source },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
