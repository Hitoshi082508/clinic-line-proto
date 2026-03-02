import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";
import { pushMessage, textMessage } from "@/lib/line";
import { buildCustomerQuery, type CustomerFilters } from "@/lib/customerQuery";

const MAX_SEGMENT_LIMIT = 50;

export async function POST(request: NextRequest) {
  let body: { filters: CustomerFilters; message: string; limit?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.message?.trim()) {
    return NextResponse.json(
      { ok: false, error: "message is required" },
      { status: 400 }
    );
  }

  if (body.message.length > 5000) {
    return NextResponse.json(
      { ok: false, error: "message must be 5000 characters or less" },
      { status: 400 }
    );
  }

  const effectiveLimit = Math.min(body.limit ?? MAX_SEGMENT_LIMIT, MAX_SEGMENT_LIMIT);
  const segmentId = crypto.randomUUID();
  const filters = body.filters ?? {};

  const { data: customers, error: queryErr } = await buildCustomerQuery(filters).limit(effectiveLimit);

  if (queryErr) {
    return NextResponse.json(
      { ok: false, error: queryErr.message, details: queryErr },
      { status: 500 }
    );
  }

  const targets = (customers ?? []).filter(
    (c: { line_user_id?: string }) => c.line_user_id
  );
  const targetCount = targets.length;

  let sentCount = 0;
  let failedCount = 0;
  const failedSamples: { customer_id: string; error: string }[] = [];

  for (const customer of targets) {
    const result = await pushMessage(customer.line_user_id, [
      textMessage(body.message.trim()),
    ]);

    const { error: logErr } = await supabase.from("message_logs").insert({
      customer_id: customer.id,
      line_user_id: customer.line_user_id,
      message_type: "segment",
      message_text: body.message.trim(),
      status: result.ok ? "sent" : "failed",
      error_detail: result.ok ? null : result.lineResponse ?? null,
      segment_id: segmentId,
    });

    if (logErr) {
      console.error("[Segment] Failed to log message:", logErr);
    }

    if (result.ok) {
      sentCount++;
    } else {
      failedCount++;
      if (failedSamples.length < 3) {
        failedSamples.push({
          customer_id: customer.id,
          error: `LINE API ${result.status}: ${result.lineResponse?.slice(0, 200) ?? "unknown"}`,
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    segment_id: segmentId,
    target_count: targetCount,
    sent_count: sentCount,
    failed_count: failedCount,
    failed_samples: failedSamples,
  });
}
