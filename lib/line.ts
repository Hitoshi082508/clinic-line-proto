import crypto from "crypto";

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!;
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

// ── 署名検証 ─────────────────────────────
export function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac("SHA256", CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  return hash === signature;
}

// ── LINE メッセージ型 ────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LineMessage = Record<string, any>;

export interface QuickReplyAction {
  label: string;
  data: string;
  displayText?: string;
}

/** Quick Reply 付きテキストメッセージを組み立てる */
export function textWithQuickReply(
  text: string,
  actions: QuickReplyAction[]
): LineMessage {
  return {
    type: "text",
    text,
    quickReply: {
      items: actions.map((a) => ({
        type: "action",
        action: {
          type: "postback",
          label: a.label,
          data: a.data,
          displayText: a.displayText ?? a.label,
        },
      })),
    },
  };
}

/** プレーンテキストメッセージ */
export function textMessage(text: string): LineMessage {
  return { type: "text", text };
}

// ── Reply API ────────────────────────────
export async function replyMessage(
  replyToken: string,
  messages: LineMessage[]
): Promise<void> {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[LINE Reply API error]", res.status, err);
  }
}
