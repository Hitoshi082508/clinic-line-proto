"use client";

import { useState } from "react";
import {
  GENDER_LABELS,
  AGE_RANGE_LABELS,
  CONCERN_LABELS,
} from "@/lib/labels";
import styles from "./page.module.css";

const GENDER_ENTRIES = Object.entries(GENDER_LABELS);
const AGE_ENTRIES = Object.entries(AGE_RANGE_LABELS);
const CONCERN_ENTRIES = Object.entries(CONCERN_LABELS);

export default function DebugPage() {
  const [form, setForm] = useState({
    line_user_id: "",
    display_name: "",
    age_range: "",
    gender: "",
    concerns: [] as string[],
  });
  const [result, setResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleConcernToggle = (value: string) => {
    setForm((prev) => ({
      ...prev,
      concerns: prev.concerns.includes(value)
        ? prev.concerns.filter((c) => c !== value)
        : [...prev.concerns, value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    const body = {
      line_user_id: form.line_user_id,
      display_name: form.display_name || undefined,
      age_range: form.age_range || undefined,
      gender: form.gender || undefined,
      concerns: form.concerns.length > 0 ? form.concerns : undefined,
    };

    try {
      const res = await fetch("/api/customers/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (err: unknown) {
      setResult(
        JSON.stringify(
          { ok: false, error: err instanceof Error ? err.message : "不明なエラー" },
          null,
          2
        )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>デバッグ：顧客データ送信</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          LINE ユーザーID *
          <input
            name="line_user_id"
            value={form.line_user_id}
            onChange={handleChange}
            required
            className={styles.input}
            placeholder="test-001"
          />
        </label>

        <label className={styles.label}>
          表示名
          <input
            name="display_name"
            value={form.display_name}
            onChange={handleChange}
            className={styles.input}
            placeholder="山田 太郎"
          />
        </label>

        <label className={styles.label}>
          年齢層
          <select
            name="age_range"
            value={form.age_range}
            onChange={handleChange}
            className={styles.input}
          >
            <option value="">-- 選択 --</option>
            {AGE_ENTRIES.map(([value, lbl]) => (
              <option key={value} value={value}>{lbl}</option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          性別
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className={styles.input}
          >
            <option value="">-- 選択 --</option>
            {GENDER_ENTRIES.map(([value, lbl]) => (
              <option key={value} value={value}>{lbl}</option>
            ))}
          </select>
        </label>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>お悩み（複数選択可）</legend>
          <div className={styles.checkboxGroup}>
            {CONCERN_ENTRIES.map(([value, lbl]) => (
              <label key={value} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.concerns.includes(value)}
                  onChange={() => handleConcernToggle(value)}
                />
                {lbl}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={sending} className={styles.submitBtn}>
          {sending ? "送信中..." : "送信（upsert）"}
        </button>
      </form>

      {result && (
        <div className={styles.result}>
          <h2>レスポンス</h2>
          <pre>{result}</pre>
        </div>
      )}

      <div className={styles.nav}>
        <a href="/admin/customers">顧客一覧へ</a>
      </div>
    </div>
  );
}
