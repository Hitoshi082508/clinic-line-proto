import { NextRequest, NextResponse } from "next/server";
import { verifySignature } from "@/lib/line";
import {
  handleStartProfile,
  handleTextMessage,
  handlePostback,
} from "@/lib/lineProfile";

// LINE Webhook イベント型（必要最小限）
interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
  postback?: { data: string };
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";

  if (!verifySignature(body, signature)) {
    console.warn("[Webhook] Signature verification failed");
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 401 }
    );
  }

  let parsed: { events?: LineEvent[] };
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const events = parsed.events ?? [];

  for (const event of events) {
    const userId = event.source?.userId;
    if (!userId || !event.replyToken) continue;

    console.log(`[Webhook] type=${event.type} userId=${userId}`);

    try {
      switch (event.type) {
        // 友だち追加 → プロフィール開始
        case "follow":
          await handleStartProfile(userId, event.replyToken);
          break;

        // テキストメッセージ
        case "message":
          if (event.message?.type === "text" && event.message.text) {
            await handleTextMessage(
              userId,
              event.message.text,
              event.replyToken
            );
          }
          break;

        // postback（ボタン選択）
        case "postback":
          if (event.postback?.data) {
            await handlePostback(
              userId,
              event.postback.data,
              event.replyToken
            );
          }
          break;
      }
    } catch (err) {
      console.error(`[Webhook] Error handling event:`, err);
    }
  }

  return NextResponse.json({ ok: true });
}
