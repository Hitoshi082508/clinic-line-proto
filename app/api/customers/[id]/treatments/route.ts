import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

// GET /api/customers/[id]/treatments
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("treatments")
    .select("*")
    .eq("customer_id", id)
    .order("treatment_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, details: error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, treatments: data });
}

// POST /api/customers/[id]/treatments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { treatment_type: string; treatment_at: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.treatment_type || !body.treatment_at) {
    return NextResponse.json(
      { ok: false, error: "treatment_type and treatment_at are required" },
      { status: 400 }
    );
  }

  const row = {
    customer_id: id,
    treatment_type: body.treatment_type,
    treatment_at: body.treatment_at,
    note: body.note ?? null,
  };

  const { data, error } = await supabase
    .from("treatments")
    .insert(row)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, details: error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, treatment: data });
}
