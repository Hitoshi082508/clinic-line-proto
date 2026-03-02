"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function DebugPage() {
  const [form, setForm] = useState({
    line_user_id: "",
    display_name: "",
    age_range: "",
    gender: "",
    concerns: "",
  });
  const [result, setResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      concerns: form.concerns
        ? form.concerns.split(",").map((s) => s.trim())
        : undefined,
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
          { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
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
      <h1 className={styles.title}>Debug: Customer Upsert</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          line_user_id *
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
          display_name
          <input
            name="display_name"
            value={form.display_name}
            onChange={handleChange}
            className={styles.input}
            placeholder="山田太郎"
          />
        </label>

        <label className={styles.label}>
          age_range
          <select
            name="age_range"
            value={form.age_range}
            onChange={handleChange}
            className={styles.input}
          >
            <option value="">-- 選択 --</option>
            <option value="~19">~19</option>
            <option value="20-29">20-29</option>
            <option value="30-39">30-39</option>
            <option value="40-49">40-49</option>
            <option value="50-59">50-59</option>
            <option value="60~">60~</option>
          </select>
        </label>

        <label className={styles.label}>
          gender
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className={styles.input}
          >
            <option value="">-- 選択 --</option>
            <option value="male">male</option>
            <option value="female">female</option>
            <option value="other">other</option>
          </select>
        </label>

        <label className={styles.label}>
          concerns（カンマ区切り）
          <input
            name="concerns"
            value={form.concerns}
            onChange={handleChange}
            className={styles.input}
            placeholder="acne, wrinkles, spots"
          />
        </label>

        <button type="submit" disabled={sending} className={styles.submitBtn}>
          {sending ? "送信中..." : "POST /api/customers/upsert"}
        </button>
      </form>

      {result && (
        <div className={styles.result}>
          <h2>Response</h2>
          <pre>{result}</pre>
        </div>
      )}

      <div className={styles.nav}>
        <a href="/admin/customers">Customer 一覧へ</a>
      </div>
    </div>
  );
}
