/**
 * customers テーブルに profile 関連カラムを追加するマイグレーションスクリプト
 * 実行: npx tsx scripts/add-profile-columns.ts
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  // カラムの存在チェック: profile_step が SELECT できるか試す
  const { error: checkError } = await supabase
    .from("customers")
    .select("profile_step")
    .limit(1);

  if (!checkError) {
    console.log("profile_step column already exists. Migration not needed.");
    return;
  }

  console.log("profile_step column not found. Adding columns via rpc...");
  console.log("Error was:", checkError.message);

  // Supabase では REST API で直接 DDL を実行できないため、
  // SQL Editor での実行が必要です。以下の SQL を実行してください:
  console.log(`
========================================
Supabase Dashboard → SQL Editor で以下を実行してください:

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS profile_step text,
  ADD COLUMN IF NOT EXISTS profile_status text,
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz;

========================================
`);
}

migrate().catch(console.error);
