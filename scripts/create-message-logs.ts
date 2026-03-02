/**
 * message_logs テーブルを作成するマイグレーションスクリプト
 * 実行: npx tsx scripts/create-message-logs.ts
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  const { error: checkError } = await supabase
    .from("message_logs")
    .select("id")
    .limit(1);

  if (!checkError) {
    console.log("message_logs table already exists. Migration not needed.");
    return;
  }

  console.log("message_logs table not found.");
  console.log("Error was:", checkError.message);

  console.log(`
========================================
Supabase Dashboard → SQL Editor で以下を実行してください:

CREATE TABLE IF NOT EXISTS message_logs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  line_user_id  text NOT NULL,
  message_type  text NOT NULL CHECK (message_type IN ('individual', 'segment')),
  message_text  text NOT NULL,
  status        text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_detail  text,
  segment_id    uuid,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_message_logs_customer_id ON message_logs(customer_id, created_at DESC);
CREATE INDEX idx_message_logs_segment_id ON message_logs(segment_id) WHERE segment_id IS NOT NULL;

========================================
`);
}

migrate().catch(console.error);
