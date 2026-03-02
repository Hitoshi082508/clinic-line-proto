"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  GENDER_LABELS,
  AGE_RANGE_LABELS,
  CONCERN_LABELS,
  TREATMENT_TYPE_LABELS,
  label,
} from "@/lib/labels";
import styles from "./page.module.css";

interface Customer {
  id: string;
  line_user_id: string;
  display_name: string | null;
  age_range: string | null;
  gender: string | null;
  concerns: string[] | null;
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Treatment {
  id: string;
  customer_id: string;
  treatment_type: string;
  treatment_at: string;
  note: string | null;
  created_at: string;
}

const TREATMENT_TYPE_KEYS = Object.keys(TREATMENT_TYPE_LABELS);

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // last_visit_at editor
  const [editingVisit, setEditingVisit] = useState(false);
  const [visitValue, setVisitValue] = useState("");
  const [visitSaving, setVisitSaving] = useState(false);

  // treatment form
  const [tForm, setTForm] = useState({
    treatment_type: TREATMENT_TYPE_KEYS[0],
    treatment_at: "",
    note: "",
  });
  const [tSaving, setTSaving] = useState(false);
  const [tError, setTError] = useState<string | null>(null);

  const fetchCustomer = useCallback(async () => {
    const res = await fetch(`/api/customers/${id}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    setCustomer(json.customer);
    if (json.customer.last_visit_at) {
      setVisitValue(toLocalDatetime(json.customer.last_visit_at));
    }
  }, [id]);

  const fetchTreatments = useCallback(async () => {
    const res = await fetch(`/api/customers/${id}/treatments`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    setTreatments(json.treatments);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchCustomer(), fetchTreatments()])
      .catch((e) => setError(e instanceof Error ? e.message : "エラーが発生しました"))
      .finally(() => setLoading(false));
  }, [fetchCustomer, fetchTreatments]);

  // ── Handlers ──────────────────────────
  const handleVisitSave = async () => {
    setVisitSaving(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last_visit_at: visitValue ? new Date(visitValue).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setCustomer(json.customer);
      setEditingVisit(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setVisitSaving(false);
    }
  };

  const handleTreatmentAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setTSaving(true);
    setTError(null);
    try {
      const res = await fetch(`/api/customers/${id}/treatments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treatment_type: tForm.treatment_type,
          treatment_at: new Date(tForm.treatment_at).toISOString(),
          note: tForm.note || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      await fetchTreatments();
      setTForm({ treatment_type: TREATMENT_TYPE_KEYS[0], treatment_at: "", note: "" });
    } catch (err: unknown) {
      setTError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setTSaving(false);
    }
  };

  // ── Render helpers ────────────────────
  function toLocalDatetime(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("ja-JP");
  };

  if (loading) return <div className={styles.container}><p>読み込み中...</p></div>;
  if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;
  if (!customer) return <div className={styles.container}><p>見つかりません</p></div>;

  return (
    <div className={styles.container}>
      <a href="/admin/customers" className={styles.back}>← 一覧に戻る</a>

      <h1 className={styles.title}>{customer.display_name ?? "名前なし"}</h1>

      {/* ── 顧客情報 ── */}
      <table className={styles.infoTable}>
        <tbody>
          <tr><th>LINE ID</th><td className={styles.mono}>{customer.line_user_id}</td></tr>
          <tr><th>年齢層</th><td>{label(AGE_RANGE_LABELS, customer.age_range)}</td></tr>
          <tr><th>性別</th><td>{label(GENDER_LABELS, customer.gender)}</td></tr>
          <tr><th>お悩み</th><td>{customer.concerns?.map((v) => label(CONCERN_LABELS, v)).join(", ") ?? "-"}</td></tr>
          <tr>
            <th>最終来店</th>
            <td>
              {editingVisit ? (
                <span className={styles.editRow}>
                  <input
                    type="datetime-local"
                    value={visitValue}
                    onChange={(e) => setVisitValue(e.target.value)}
                    className={styles.dateInput}
                  />
                  <button onClick={handleVisitSave} disabled={visitSaving} className={styles.saveBtn}>
                    {visitSaving ? "保存中..." : "保存"}
                  </button>
                  <button onClick={() => setEditingVisit(false)} className={styles.cancelBtn}>
                    キャンセル
                  </button>
                </span>
              ) : (
                <span>
                  {formatDate(customer.last_visit_at)}{" "}
                  <button
                    onClick={() => {
                      setVisitValue(customer.last_visit_at ? toLocalDatetime(customer.last_visit_at) : "");
                      setEditingVisit(true);
                    }}
                    className={styles.editBtn}
                  >
                    編集
                  </button>
                </span>
              )}
            </td>
          </tr>
          <tr><th>登録日</th><td>{formatDate(customer.created_at)}</td></tr>
        </tbody>
      </table>

      {/* ── 施術履歴 ── */}
      <h2 className={styles.sectionTitle}>施術履歴 ({treatments.length}件)</h2>

      <form onSubmit={handleTreatmentAdd} className={styles.treatmentForm}>
        <select
          value={tForm.treatment_type}
          onChange={(e) => setTForm({ ...tForm, treatment_type: e.target.value })}
          className={styles.treatmentSelect}
        >
          {TREATMENT_TYPE_KEYS.map((key) => (
            <option key={key} value={key}>{TREATMENT_TYPE_LABELS[key]}</option>
          ))}
        </select>

        <input
          type="datetime-local"
          value={tForm.treatment_at}
          onChange={(e) => setTForm({ ...tForm, treatment_at: e.target.value })}
          required
          className={styles.dateInput}
        />

        <input
          type="text"
          placeholder="メモ（任意）"
          value={tForm.note}
          onChange={(e) => setTForm({ ...tForm, note: e.target.value })}
          className={styles.noteInput}
        />

        <button type="submit" disabled={tSaving} className={styles.addBtn}>
          {tSaving ? "追加中..." : "追加"}
        </button>
      </form>

      {tError && <p className={styles.error}>{tError}</p>}

      {treatments.length === 0 ? (
        <p className={styles.muted}>施術履歴なし</p>
      ) : (
        <table className={styles.treatmentTable}>
          <thead>
            <tr>
              <th>施術内容</th>
              <th>施術日時</th>
              <th>メモ</th>
            </tr>
          </thead>
          <tbody>
            {treatments.map((t) => (
              <tr key={t.id}>
                <td>{label(TREATMENT_TYPE_LABELS, t.treatment_type)}</td>
                <td>{formatDate(t.treatment_at)}</td>
                <td>{t.note ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
