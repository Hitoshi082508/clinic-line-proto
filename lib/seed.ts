/**
 * Seed data generator for clinic customers & treatments.
 * No external dependencies — uses built-in Math.random with weighted distributions.
 */

// ── Name pools ──────────────────────────────────────────
const FAMILY_NAMES = [
  "佐藤","鈴木","高橋","田中","伊藤","渡辺","山本","中村","小林","加藤",
  "吉田","山田","松本","井上","木村","林","清水","山崎","池田","阿部",
  "森","橋本","石川","前田","藤田","後藤","岡田","長谷川","村上","近藤",
  "石井","斎藤","坂本","遠藤","青木","藤井","西村","福田","太田","三浦",
  "岡本","松田","中川","中野","原田","小野","田村","竹内","金子","和田",
];
const FEMALE_NAMES = [
  "花子","美咲","さくら","陽菜","結衣","愛","真由美","恵子","千春","美月",
  "由美","裕子","明美","久美子","京子","幸子","直美","麻衣","彩","遥",
  "菜々子","瞳","葵","凛","桃子","芽衣","莉子","詩織","綾乃","千尋",
];
const MALE_NAMES = [
  "太郎","大翔","蓮","健太","翔太","直樹","和也","隆","浩二","拓也",
  "翔","悠真","陸","颯太","大輝","涼太","雄太","亮","誠","学",
  "裕介","達也","俊介","慎一","哲也","浩","秀樹","剛","智也","圭介",
];

const AGE_RANGES = ["10-19","20-29","30-39","40-49","50-59","60~"] as const;
const AGE_WEIGHTS = [5, 30, 30, 20, 10, 5]; // sum=100

const GENDER_OPTIONS = ["female","male","other","no_answer"] as const;
const GENDER_WEIGHTS = [70, 25, 3, 2]; // sum=100



// ── Helpers ─────────────────────────────────────────────
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T>(items: readonly T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randomInt(9, 19), randomInt(0, 59), 0, 0);
  return d;
}

// ── Concern generation (age-aware) ──────────────────────
function generateConcerns(ageRange: string): string[] {
  const count = weightedPick([1, 2, 3], [30, 50, 20]);
  const pool: { item: string; w: number }[] = [];

  const isYoung = ["10-19","20-29","30-39"].includes(ageRange);
  const isOlder = ["40-49","50-59","60~"].includes(ageRange);

  pool.push({ item: "acne",          w: isYoung ? 30 : 10 });
  pool.push({ item: "pores",         w: 25 });
  pool.push({ item: "spots",         w: isOlder ? 30 : 15 });
  pool.push({ item: "wrinkles",      w: isOlder ? 35 : 5 });
  pool.push({ item: "hair_removal",  w: isYoung ? 25 : 5 });
  pool.push({ item: "other",         w: 5 });

  const result: string[] = [];
  const remaining = [...pool];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    const weights = remaining.map((p) => p.w);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < remaining.length - 1; idx++) {
      r -= remaining[idx].w;
      if (r <= 0) break;
    }
    result.push(remaining[idx].item);
    remaining.splice(idx, 1);
  }
  return result;
}

// ── last_visit_at generation ────────────────────────────
function generateLastVisit(): Date | null {
  // 20% null
  if (Math.random() < 0.2) return null;
  // weighted toward recent visits
  const bucket = weightedPick(
    ["recent", "medium", "old"],
    [50, 30, 20]
  );
  let days: number;
  switch (bucket) {
    case "recent":  days = randomInt(0, 30);  break;
    case "medium":  days = randomInt(31, 180); break;
    default:        days = randomInt(181, 365); break;
  }
  return daysAgo(days);
}

// ── Treatment generation (concern-aware) ────────────────
function pickTreatmentType(concerns: string[]): string {
  // Build weighted list based on concerns
  const map: Record<string, { type: string; w: number }[]> = {
    acne:          [{ type: "peeling", w: 40 }, { type: "dermapen", w: 40 }, { type: "other", w: 20 }],
    pores:         [{ type: "dermapen", w: 40 }, { type: "peeling", w: 30 }, { type: "laser", w: 30 }],
    spots:         [{ type: "laser", w: 60 }, { type: "peeling", w: 20 }, { type: "other", w: 20 }],
    wrinkles:      [{ type: "botox", w: 40 }, { type: "hyaluronic_acid", w: 40 }, { type: "other", w: 20 }],
    hair_removal:  [{ type: "medical_hair_removal", w: 80 }, { type: "other", w: 20 }],
    other:         [{ type: "other", w: 50 }, { type: "laser", w: 25 }, { type: "peeling", w: 25 }],
  };

  // pick a random concern to base the treatment on
  const concern = pick(concerns);
  const pool = map[concern] ?? map["other"];
  return weightedPick(
    pool.map((p) => p.type),
    pool.map((p) => p.w)
  );
}

interface GeneratedTreatment {
  treatment_type: string;
  treatment_at: string;
  note: string | null;
}

function generateTreatments(
  concerns: string[],
  lastVisit: Date | null
): GeneratedTreatment[] {
  // 40% no treatments, 30% 1-2, 20% 3-4, 10% 5
  const count = weightedPick([0, 1, 2, 3, 4, 5], [40, 15, 15, 15, 10, 5]);
  if (count === 0 || !lastVisit) return [];

  const treatments: GeneratedTreatment[] = [];
  const now = new Date();
  const diffMs = now.getTime() - lastVisit.getTime();

  for (let i = 0; i < count; i++) {
    // treatment_at: between lastVisit - 365 days ago and lastVisit
    const earliestMs = Math.max(
      lastVisit.getTime() - 365 * 24 * 60 * 60 * 1000,
      now.getTime() - 730 * 24 * 60 * 60 * 1000
    );
    const treatmentMs = earliestMs + Math.random() * (lastVisit.getTime() - earliestMs);
    // last one should match lastVisit roughly
    const finalMs = i === 0 ? lastVisit.getTime() - Math.random() * Math.min(diffMs, 3 * 24 * 60 * 60 * 1000) : treatmentMs;

    const treatmentDate = new Date(finalMs);
    treatmentDate.setHours(randomInt(9, 18), randomInt(0, 59), 0, 0);

    const notes = [null, null, null, "経過良好", "次回予約済み", "初回カウンセリング", "2回目の施術"];
    treatments.push({
      treatment_type: pickTreatmentType(concerns),
      treatment_at: treatmentDate.toISOString(),
      note: pick(notes),
    });
  }

  return treatments;
}

// ── Main: generate one customer + treatments ────────────
export interface SeedCustomer {
  line_user_id: string;
  display_name: string;
  age_range: string;
  gender: string;
  concerns: string[];
  last_visit_at: string | null;
  updated_at: string;
}

export interface SeedTreatment {
  customer_id?: string;
  treatment_type: string;
  treatment_at: string;
  note: string | null;
}

export interface SeedRecord {
  customer: SeedCustomer;
  treatments: SeedTreatment[];
}

export function generateSeedData(count: number): SeedRecord[] {
  const prefix = `seed_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_`;
  const records: SeedRecord[] = [];

  for (let i = 0; i < count; i++) {
    const gender = weightedPick(GENDER_OPTIONS, GENDER_WEIGHTS);
    const ageRange = weightedPick(AGE_RANGES, AGE_WEIGHTS);
    const firstName = gender === "male" ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
    const familyName = pick(FAMILY_NAMES);
    const concerns = generateConcerns(ageRange);
    const lastVisit = generateLastVisit();

    const customer: SeedCustomer = {
      line_user_id: `${prefix}${String(i).padStart(5, "0")}_${randomInt(1000, 9999)}`,
      display_name: `${familyName} ${firstName}`,
      age_range: ageRange,
      gender,
      concerns,
      last_visit_at: lastVisit ? lastVisit.toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const treatments = generateTreatments(concerns, lastVisit);

    records.push({ customer, treatments });
  }

  return records;
}
