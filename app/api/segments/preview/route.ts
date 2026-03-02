import { NextRequest, NextResponse } from "next/server";
import { buildCustomerQuery, parseFiltersFromParams } from "@/lib/customerQuery";

export async function GET(request: NextRequest) {
  const filters = parseFiltersFromParams(request.nextUrl.searchParams);
  const { data, error } = await buildCustomerQuery(filters)
    .select("id, display_name, line_user_id");

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, details: error },
      { status: 500 }
    );
  }

  const all = data ?? [];
  const withLineId = all.filter((c) => c.line_user_id);
  const samples = withLineId.slice(0, 5).map((c) => ({
    id: c.id,
    display_name: c.display_name,
  }));

  return NextResponse.json({ ok: true, count: withLineId.length, samples });
}
