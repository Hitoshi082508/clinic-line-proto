import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";
import { pushMessage, textMessage } from "@/lib/line";

export async function POST(request: NextRequest) {
  let body: { customer_id: string; message: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.customer_id || !body.message?.trim()) {
    return NextResponse.json(
      { ok: false, error: "customer_id and message are required" },
      { status: 400 }
    );
  }

  if (body.message.length > 5000) {
    return NextResponse.json(
      { ok: false, error: "message must be 5000 characters or less" },
      { status: 400 }
    );
  }

  // 顧客取得
  const { data: customer, error: custErr } = await supabase
    .from("customers")
    .select("id, line_user_id")
    .eq("id", body.customer_id)
    .single();

  if (custErr || !customer) {
    return NextResponse.json(
      { ok: false, error: "Customer not found" },
      { status: 404 }
    );
  }

  if (!customer.line_user_id) {
    return NextResponse.json(
      { ok: false, error: "Customer has no LINE user ID" },
      { status: 400 }
    );
  }

  // LINE Push API 実行
  const result = await pushMessage(customer.line_user_id, [
    textMessage(body.message.trim()),
  ]);

  // message_logs に保存
  const { error: logErr } = await supabase.from("message_logs").insert({
    customer_id: customer.id,
    line_user_id: customer.line_user_id,
    message_type: "individual",
    message_text: body.message.trim(),
    status: result.ok ? "sent" : "failed",
    error_detail: result.ok ? null : result.lineResponse ?? null,
    segment_id: null,
  });

  if (logErr) {
    console.error("[Push] Failed to insert message_log:", logErr);
  }

  return NextResponse.json({
    ok: result.ok,
    status: result.status,
    error: result.ok ? undefined : `LINE API error (${result.status})`,
  });
}
