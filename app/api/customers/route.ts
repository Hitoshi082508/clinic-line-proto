import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const gender = sp.get("gender") ?? "";
  const ageRange = sp.get("age_range") ?? "";
  const concern = sp.get("concern") ?? "";
  const lastVisitFilter = sp.get("last_visit_filter") ?? "";

  let query = supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  // Text search: display_name OR line_user_id partial match
  if (q) {
    query = query.or(
      `line_user_id.ilike.%${q}%,display_name.ilike.%${q}%`
    );
  }

  // Gender filter
  if (gender) {
    query = query.eq("gender", gender);
  }

  // Age range filter
  if (ageRange) {
    query = query.eq("age_range", ageRange);
  }

  // Concern filter: concerns jsonb array contains the value
  if (concern) {
    query = query.filter("concerns", "cs", JSON.stringify([concern]));
  }

  // Last visit filter
  if (lastVisitFilter === "missing") {
    query = query.is("last_visit_at", null);
  } else if (lastVisitFilter.startsWith("over_")) {
    const daysStr = lastVisitFilter.replace("over_", "").replace("_days", "");
    const days = parseInt(daysStr, 10);
    if (!isNaN(days)) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      query = query.lt("last_visit_at", cutoff.toISOString());
    }
  }

  const { data, error } = await query.limit(500);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, details: error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, customers: data });
}
