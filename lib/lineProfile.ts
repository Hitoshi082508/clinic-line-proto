import { supabase } from "@/lib/supabaseServer";
import {
  replyMessage,
  textMessage,
  textWithQuickReply,
  type QuickReplyAction,
} from "@/lib/line";
import { CONCERN_LABELS, AGE_RANGE_LABELS, GENDER_LABELS } from "@/lib/labels";

// ── 定数 ─────────────────────────────────
type ProfileStep =
  | "display_name"
  | "age_range"
  | "gender"
  | "concerns"
  | "done";

const CONCERN_KEYS = Object.keys(CONCERN_LABELS);

// ── DB ヘルパー ──────────────────────────
async function getOrCreateCustomer(lineUserId: string) {
  // 既存を取得
  const { data: existing } = await supabase
    .from("customers")
    .select("*")
    .eq("line_user_id", lineUserId)
    .single();

  if (existing) return existing;

  // 新規作成
  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      line_user_id: lineUserId,
      profile_step: "display_name",
      profile_status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[Profile] Failed to create customer:", error);
    return null;
  }
  return created;
}

async function updateCustomer(
  lineUserId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields: Record<string, any>
) {
  const { error } = await supabase
    .from("customers")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("line_user_id", lineUserId);

  if (error) console.error("[Profile] Update failed:", error);
}

// ── Quick Reply ビルダー ─────────────────
function ageQuickReply(): QuickReplyAction[] {
  return Object.entries(AGE_RANGE_LABELS).map(([key, lbl]) => ({
    label: lbl,
    data: `age:${key}`,
  }));
}

function genderQuickReply(): QuickReplyAction[] {
  return Object.entries(GENDER_LABELS).map(([key, lbl]) => ({
    label: lbl,
    data: `gender:${key}`,
  }));
}

function concernQuickReply(): QuickReplyAction[] {
  const items: QuickReplyAction[] = CONCERN_KEYS.map((key) => ({
    label: CONCERN_LABELS[key],
    data: `concern:add:${key}`,
  }));
  items.push({
    label: "選択を終了する",
    data: "concern:done",
    displayText: "選択を終了する",
  });
  return items;
}

// ── ステップごとの質問メッセージ ─────────
function askDisplayName() {
  return textMessage(
    "プロフィール登録を始めます。\nまず、お名前（表示名）を入力してください。"
  );
}

function askAgeRange() {
  return textWithQuickReply(
    "年齢層を選択してください。",
    ageQuickReply()
  );
}

function askGender() {
  return textWithQuickReply(
    "性別を選択してください。",
    genderQuickReply()
  );
}

function askConcerns(current: string[]) {
  const selected =
    current.length > 0
      ? `\n現在の選択: ${current.map((c) => CONCERN_LABELS[c] ?? c).join(", ")}`
      : "";
  return textWithQuickReply(
    `お悩みを選んでください（複数選択可）。${selected}\n選び終わったら「選択を終了する」を押してください。`,
    concernQuickReply()
  );
}

function profileCompleteMessage() {
  return {
    type: "text",
    text: "プロフィール登録が完了しました！\nありがとうございます。\n\n内容を変更したい場合は下のボタンを押してください。",
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "postback",
            label: "プロフィールを更新する",
            data: "profile:reset",
            displayText: "プロフィールを更新する",
          },
        },
      ],
    },
  };
}

// ── メインハンドラ ───────────────────────

/** follow イベント or profile:reset */
export async function handleStartProfile(
  lineUserId: string,
  replyToken: string
) {
  await updateCustomer(lineUserId, {
    profile_step: "display_name",
    profile_status: "in_progress",
    concerns: [],
    profile_completed_at: null,
  });

  // 新規の場合は先に insert してから
  await getOrCreateCustomer(lineUserId);

  await replyMessage(replyToken, [askDisplayName()]);
}

/** テキストメッセージ受信 */
export async function handleTextMessage(
  lineUserId: string,
  text: string,
  replyToken: string
) {
  const customer = await getOrCreateCustomer(lineUserId);
  if (!customer) {
    await replyMessage(replyToken, [
      textMessage("エラーが発生しました。もう一度お試しください。"),
    ]);
    return;
  }

  const step: ProfileStep | null = customer.profile_step;

  switch (step) {
    case "display_name": {
      await updateCustomer(lineUserId, {
        display_name: text.trim(),
        profile_step: "age_range",
      });
      await replyMessage(replyToken, [
        textMessage(`「${text.trim()}」で登録しました。`),
        askAgeRange(),
      ]);
      break;
    }

    case "age_range":
    case "gender":
    case "concerns":
      // これらのステップではボタン選択を期待
      await replyMessage(replyToken, [
        textMessage("下のボタンから選択してください。"),
      ]);
      break;

    case "done":
    default:
      // プロフィール完了済み or 未開始
      await replyMessage(replyToken, [profileCompleteMessage()]);
      break;
  }
}

/** postback イベント処理 */
export async function handlePostback(
  lineUserId: string,
  data: string,
  replyToken: string
) {
  // profile:reset
  if (data === "profile:reset") {
    await handleStartProfile(lineUserId, replyToken);
    return;
  }

  const customer = await getOrCreateCustomer(lineUserId);
  if (!customer) {
    await replyMessage(replyToken, [
      textMessage("エラーが発生しました。もう一度お試しください。"),
    ]);
    return;
  }

  const step: ProfileStep | null = customer.profile_step;

  // age:XX
  if (data.startsWith("age:") && step === "age_range") {
    const ageRange = data.replace("age:", "");
    const lbl = AGE_RANGE_LABELS[ageRange] ?? ageRange;
    await updateCustomer(lineUserId, {
      age_range: ageRange,
      profile_step: "gender",
    });
    await replyMessage(replyToken, [
      textMessage(`${lbl}で登録しました。`),
      askGender(),
    ]);
    return;
  }

  // gender:XX
  if (data.startsWith("gender:") && step === "gender") {
    const gender = data.replace("gender:", "");
    const lbl = GENDER_LABELS[gender] ?? gender;
    await updateCustomer(lineUserId, {
      gender,
      profile_step: "concerns",
      concerns: [],
    });
    await replyMessage(replyToken, [
      textMessage(`${lbl}で登録しました。`),
      askConcerns([]),
    ]);
    return;
  }

  // concern:add:XX
  if (data.startsWith("concern:add:") && step === "concerns") {
    const concernKey = data.replace("concern:add:", "");
    const currentConcerns: string[] = customer.concerns ?? [];

    if (currentConcerns.includes(concernKey)) {
      // 重複 → 追加せず通知
      const lbl = CONCERN_LABELS[concernKey] ?? concernKey;
      await replyMessage(replyToken, [
        textMessage(`「${lbl}」は既に選択済みです。`),
        askConcerns(currentConcerns),
      ]);
    } else {
      // 追加
      const updated = [...currentConcerns, concernKey];
      await updateCustomer(lineUserId, { concerns: updated });
      const lbl = CONCERN_LABELS[concernKey] ?? concernKey;
      await replyMessage(replyToken, [
        textMessage(`追加しました：${lbl}`),
        askConcerns(updated),
      ]);
    }
    return;
  }

  // concern:done
  if (data === "concern:done" && step === "concerns") {
    const currentConcerns: string[] = customer.concerns ?? [];
    const summary =
      currentConcerns.length > 0
        ? currentConcerns.map((c) => CONCERN_LABELS[c] ?? c).join(", ")
        : "なし";

    await updateCustomer(lineUserId, {
      profile_step: "done",
      profile_status: "complete",
      profile_completed_at: new Date().toISOString(),
    });

    await replyMessage(replyToken, [
      textMessage(`お悩み: ${summary}\n\nプロフィール登録が完了しました！`),
      profileCompleteMessage(),
    ]);
    return;
  }

  // 想定外の postback
  console.warn(`[Profile] Unexpected postback: data=${data} step=${step}`);
  await replyMessage(replyToken, [
    textMessage("操作を認識できませんでした。もう一度お試しください。"),
  ]);
}
