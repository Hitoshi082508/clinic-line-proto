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

/**
 * 顧客を upsert（取得 or 作成 + 更新）する
 * line_user_id で一意。追加フィールドがあれば同時に反映。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertCustomer(lineUserId: string, fields?: Record<string, any>) {
  const row = {
    line_user_id: lineUserId,
    updated_at: new Date().toISOString(),
    ...fields,
  };

  const { data, error } = await supabase
    .from("customers")
    .upsert(row, { onConflict: "line_user_id" })
    .select()
    .single();

  if (error) {
    console.error("[Profile] upsertCustomer failed:", error.message, error);
    return null;
  }
  return data;
}

/**
 * 顧客を取得するだけ（更新不要時）
 */
async function getCustomer(lineUserId: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("line_user_id", lineUserId)
    .single();

  if (error) {
    console.error("[Profile] getCustomer failed:", error.message);
    return null;
  }
  return data;
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

/** follow イベント or profile:reset → プロフィール開始 */
export async function handleStartProfile(
  lineUserId: string,
  replyToken: string
) {
  const customer = await upsertCustomer(lineUserId, {
    profile_step: "display_name",
    profile_status: "in_progress",
    concerns: [],
    profile_completed_at: null,
  });

  if (!customer) {
    await replyMessage(replyToken, [
      textMessage("初期化に失敗しました。しばらくしてからもう一度お試しください。"),
    ]);
    return;
  }

  await replyMessage(replyToken, [askDisplayName()]);
}

/** テキストメッセージ受信 */
export async function handleTextMessage(
  lineUserId: string,
  text: string,
  replyToken: string
) {
  const customer = await getCustomer(lineUserId);

  if (!customer) {
    // 未登録ユーザー → プロフィール開始
    await handleStartProfile(lineUserId, replyToken);
    return;
  }

  const step: ProfileStep | null = customer.profile_step;

  switch (step) {
    case "display_name": {
      const updated = await upsertCustomer(lineUserId, {
        display_name: text.trim(),
        profile_step: "age_range",
      });
      if (!updated) {
        await replyMessage(replyToken, [
          textMessage("保存に失敗しました。もう一度入力してください。"),
        ]);
        return;
      }
      await replyMessage(replyToken, [
        textMessage(`「${text.trim()}」で登録しました。`),
        askAgeRange(),
      ]);
      break;
    }

    case "age_range":
    case "gender":
    case "concerns":
      await replyMessage(replyToken, [
        textMessage("下のボタンから選択してください。"),
      ]);
      break;

    case "done":
    default:
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

  const customer = await getCustomer(lineUserId);
  if (!customer) {
    await handleStartProfile(lineUserId, replyToken);
    return;
  }

  const step: ProfileStep | null = customer.profile_step;

  // age:XX
  if (data.startsWith("age:") && step === "age_range") {
    const ageRange = data.replace("age:", "");
    const lbl = AGE_RANGE_LABELS[ageRange] ?? ageRange;
    await upsertCustomer(lineUserId, {
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
    await upsertCustomer(lineUserId, {
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
      const lbl = CONCERN_LABELS[concernKey] ?? concernKey;
      await replyMessage(replyToken, [
        textMessage(`「${lbl}」は既に選択済みです。`),
        askConcerns(currentConcerns),
      ]);
    } else {
      const updated = [...currentConcerns, concernKey];
      await upsertCustomer(lineUserId, { concerns: updated });
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

    await upsertCustomer(lineUserId, {
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

  // 想定外
  console.warn(`[Profile] Unexpected postback: data=${data} step=${step}`);
  await replyMessage(replyToken, [
    textMessage("操作を認識できませんでした。もう一度お試しください。"),
  ]);
}
