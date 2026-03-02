import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";
import { generateSeedData } from "@/lib/seed";

export async function POST(request: NextRequest) {
  // Token guard
  const token = request.headers.get("x-seed-token");
  if (!token || token !== process.env.SECRET_SEED_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: invalid or missing x-seed-token" },
      { status: 401 }
    );
  }

  const countParam = request.nextUrl.searchParams.get("count");
  const count = Math.min(Math.max(parseInt(countParam ?? "300", 10) || 300, 1), 500);

  const records = generateSeedData(count);

  // Insert customers in batches of 100
  const customerRows = records.map((r) => r.customer);
  let insertedCustomers = 0;

  for (let i = 0; i < customerRows.length; i += 100) {
    const batch = customerRows.slice(i, i + 100);
    const { error } = await supabase.from("customers").insert(batch);
    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: `Failed to insert customers batch ${i}`,
          details: error,
          insertedSoFar: insertedCustomers,
        },
        { status: 500 }
      );
    }
    insertedCustomers += batch.length;
  }

  // Fetch inserted customers to get their IDs
  const lineUserIds = customerRows.map((c) => c.line_user_id);
  const { data: insertedRows, error: fetchError } = await supabase
    .from("customers")
    .select("id, line_user_id")
    .in("line_user_id", lineUserIds);

  if (fetchError || !insertedRows) {
    return NextResponse.json(
      {
        ok: false,
        error: "Customers inserted but failed to fetch IDs for treatments",
        details: fetchError,
        insertedCustomers,
      },
      { status: 500 }
    );
  }

  // Build line_user_id → id map
  const idMap = new Map<string, string>();
  for (const row of insertedRows) {
    idMap.set(row.line_user_id, row.id);
  }

  // Collect all treatment rows
  const treatmentRows: { customer_id: string; treatment_type: string; treatment_at: string; note: string | null }[] = [];
  for (const record of records) {
    const customerId = idMap.get(record.customer.line_user_id);
    if (!customerId) continue;
    for (const t of record.treatments) {
      treatmentRows.push({
        customer_id: customerId,
        treatment_type: t.treatment_type,
        treatment_at: t.treatment_at,
        note: t.note,
      });
    }
  }

  // Insert treatments in batches
  let insertedTreatments = 0;
  for (let i = 0; i < treatmentRows.length; i += 100) {
    const batch = treatmentRows.slice(i, i + 100);
    const { error } = await supabase.from("treatments").insert(batch);
    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: `Failed to insert treatments batch ${i}`,
          details: error,
          insertedCustomers,
          insertedTreatments,
        },
        { status: 500 }
      );
    }
    insertedTreatments += batch.length;
  }

  return NextResponse.json({
    ok: true,
    insertedCustomers,
    insertedTreatments,
  });
}
