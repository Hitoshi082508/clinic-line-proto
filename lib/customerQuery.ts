import { supabase } from "@/lib/supabaseServer";

export interface CustomerFilters {
  q?: string;
  gender?: string;
  age_range?: string;
  concern?: string;
  last_visit_filter?: string;
}

/** URLSearchParams からフィルタを取り出す */
export function parseFiltersFromParams(sp: URLSearchParams): CustomerFilters {
  return {
    q: sp.get("q")?.trim() || undefined,
    gender: sp.get("gender") || undefined,
    age_range: sp.get("age_range") || undefined,
    concern: sp.get("concern") || undefined,
    last_visit_filter: sp.get("last_visit_filter") || undefined,
  };
}

/** フィルタ条件を適用した customers クエリを返す */
export function buildCustomerQuery(filters: CustomerFilters) {
  let query = supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.q) {
    query = query.or(
      `line_user_id.ilike.%${filters.q}%,display_name.ilike.%${filters.q}%`
    );
  }
  if (filters.gender) {
    query = query.eq("gender", filters.gender);
  }
  if (filters.age_range) {
    query = query.eq("age_range", filters.age_range);
  }
  if (filters.concern) {
    query = query.filter("concerns", "cs", JSON.stringify([filters.concern]));
  }
  if (filters.last_visit_filter === "missing") {
    query = query.is("last_visit_at", null);
  } else if (filters.last_visit_filter?.startsWith("over_")) {
    const daysStr = filters.last_visit_filter.replace("over_", "").replace("_days", "");
    const days = parseInt(daysStr, 10);
    if (!isNaN(days)) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      query = query.lt("last_visit_at", cutoff.toISOString());
    }
  }

  return query;
}
