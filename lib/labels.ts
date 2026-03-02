/** DB値 → 日本語ラベルの対応表（UIでのみ使用） */

export const GENDER_LABELS: Record<string, string> = {
  female: "女性",
  male: "男性",
  other: "その他",
  no_answer: "未回答",
};

export const AGE_RANGE_LABELS: Record<string, string> = {
  "10-19": "10代",
  "20-29": "20代",
  "30-39": "30代",
  "40-49": "40代",
  "50-59": "50代",
  "60~": "60代以上",
};

export const CONCERN_LABELS: Record<string, string> = {
  acne: "ニキビ",
  pores: "毛穴",
  spots: "シミ",
  wrinkles: "シワ",
  hair_removal: "脱毛",
  other: "その他",
};

export const TREATMENT_TYPE_LABELS: Record<string, string> = {
  laser: "レーザー",
  peeling: "ピーリング",
  botox: "ボトックス",
  hyaluronic_acid: "ヒアルロン酸",
  medical_hair_removal: "医療脱毛",
  dermapen: "ダーマペン",
  other: "その他",
};

/** DB値をラベルに変換。マッピングに無ければそのまま返す */
export function label(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "-";
  return map[value] ?? value;
}
