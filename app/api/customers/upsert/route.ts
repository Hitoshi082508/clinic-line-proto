import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface UpsertBody {
  line_user_id: string;
  display_name?: string;
  age_range?: string;
  gender?: string;
  concerns?: string[];
}

export async function POST(request: NextRequest) {
  let body: UpsertBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.line_user_id || typeof body.line_user_id !== "string") {
    return NextResponse.json(
      { ok: false, error: "line_user_id is required" },
      { status: 400 }
    );
  }

  const row = {
    line_user_id: body.line_user_id,
    display_name: body.display_name ?? null,
    age_range: body.age_range ?? null,
    gender: body.gender ?? null,
    concerns: body.concerns ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("customers")
    .upsert(row, { onConflict: "line_user_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, details: error },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, customer: data });
}
