import { NextRequest, NextResponse } from "next/server";
import { verifySignature, replyMessage } from "@/lib/line";

export async function POST(request: NextRequest) {
  // raw body を取得（署名検証に必要）
  const body = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";

  // 署名検証
  if (!verifySignature(body, signature)) {
    console.warn("[Webhook] Signature verification failed");
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 401 }
    );
  }

  // イベント処理
  let parsed: { events?: Array<{ type: string; replyToken?: string; source?: { userId?: string } }> };
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const events = parsed.events ?? [];

  for (const event of events) {
    const userId = event.source?.userId ?? "unknown";
    console.log(`[Webhook] type=${event.type} userId=${userId}`);

    // replyToken があるイベントに返信
    if (event.replyToken) {
      try {
        await replyMessage(event.replyToken, [
          { type: "text", text: "接続OK！" },
        ]);
      } catch (err) {
        console.error("[Webhook] Reply failed:", err);
      }
    }
  }

  // 常に 200 を返す（リトライ防止）
  return NextResponse.json({ ok: true });
}
