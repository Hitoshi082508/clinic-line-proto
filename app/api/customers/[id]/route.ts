import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

// GET /api/customers/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json(
      { ok: false, error: error.message, details: error },
      { status }
    );
  }

  return NextResponse.json({ ok: true, customer: data });
}

// PATCH /api/customers/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { last_visit_at?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const update: Record<string, string> = { updated_at: new Date().toISOString() };
  if (body.last_visit_at !== undefined) {
    update.last_visit_at = body.last_visit_at;
  }

  const { data, error } = await supabase
    .from("customers")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json(
      { ok: false, error: error.message, details: error },
      { status }
    );
  }

  return NextResponse.json({ ok: true, customer: data });
}
