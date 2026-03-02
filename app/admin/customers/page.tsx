"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  GENDER_LABELS,
  AGE_RANGE_LABELS,
  CONCERN_LABELS,
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
}

// ── フィルタ選択肢 ──────────────────────
const GENDER_OPTIONS = [
  { value: "", label: "すべて" },
  ...Object.entries(GENDER_LABELS).map(([v, l]) => ({ value: v, label: l })),
];

const AGE_OPTIONS = [
  { value: "", label: "すべて" },
  ...Object.entries(AGE_RANGE_LABELS).map(([v, l]) => ({ value: v, label: l })),
];

const CONCERN_OPTIONS = [
  { value: "", label: "すべて" },
  ...Object.entries(CONCERN_LABELS).map(([v, l]) => ({ value: v, label: l })),
];

const LAST_VISIT_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "missing", label: "未来店" },
  { value: "over_30_days", label: "30日以上" },
  { value: "over_90_days", label: "90日以上" },
  { value: "over_180_days", label: "180日以上" },
];

// ── ソート定義 ───────────────────────────
type SortKey = "display_name" | "age_range" | "gender" | "concerns" | "last_visit_at" | "created_at";
type SortDir = "asc" | "desc";

const AGE_ORDER: Record<string, number> = {
  "10-19": 1, "20-29": 2, "30-39": 3, "40-49": 4, "50-59": 5, "60~": 6,
};

function compareCustomers(a: Customer, b: Customer, key: SortKey, dir: SortDir): number {
  let result = 0;

  switch (key) {
    case "display_name":
      result = (a.display_name ?? "").localeCompare(b.display_name ?? "", "ja");
      break;
    case "age_range":
      result = (AGE_ORDER[a.age_range ?? ""] ?? 99) - (AGE_ORDER[b.age_range ?? ""] ?? 99);
      break;
    case "gender":
      result = (a.gender ?? "").localeCompare(b.gender ?? "");
      break;
    case "concerns":
      result = (a.concerns?.length ?? 0) - (b.concerns?.length ?? 0);
      break;
    case "last_visit_at": {
      const aTime = a.last_visit_at ? new Date(a.last_visit_at).getTime() : 0;
      const bTime = b.last_visit_at ? new Date(b.last_visit_at).getTime() : 0;
      result = aTime - bTime;
      break;
    }
    case "created_at":
      result = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      break;
  }

  return dir === "asc" ? result : -result;
}

// ── カラムヘッダ定義 ─────────────────────
const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "display_name", label: "名前" },
  { key: "age_range",    label: "年齢層" },
  { key: "gender",       label: "性別" },
  { key: "concerns",     label: "お悩み" },
  { key: "last_visit_at", label: "最終来店" },
  { key: "created_at",   label: "登録日" },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [concern, setConcern] = useState("");
  const [lastVisitFilter, setLastVisitFilter] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (gender) params.set("gender", gender);
      if (ageRange) params.set("age_range", ageRange);
      if (concern) params.set("concern", concern);
      if (lastVisitFilter) params.set("last_visit_filter", lastVisitFilter);
      const res = await fetch(`/api/customers?${params}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setCustomers(json.customers);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [q, gender, ageRange, concern, lastVisitFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // クライアント側ソート
  const sorted = useMemo(
    () => [...customers].sort((a, b) => compareCustomers(a, b, sortKey, sortDir)),
    [customers, sortKey, sortDir]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleReset = () => {
    setQ("");
    setGender("");
    setAgeRange("");
    setConcern("");
    setLastVisitFilter("");
    setSortKey("created_at");
    setSortDir("desc");
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("ja-JP");
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>顧客一覧 ({customers.length}件)</h1>

      <div className={styles.filters}>
        <div className={styles.filterRow}>
          <input
            type="text"
            placeholder="名前 or LINE ID で検索"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterRow}>
          <label className={styles.filterLabel}>
            性別
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={styles.filterSelect}>
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.filterLabel}>
            年齢層
            <select value={ageRange} onChange={(e) => setAgeRange(e.target.value)} className={styles.filterSelect}>
              {AGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.filterLabel}>
            お悩み
            <select value={concern} onChange={(e) => setConcern(e.target.value)} className={styles.filterSelect}>
              {CONCERN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.filterLabel}>
            最終来店
            <select value={lastVisitFilter} onChange={(e) => setLastVisitFilter(e.target.value)} className={styles.filterSelect}>
              {LAST_VISIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <button onClick={handleReset} className={styles.resetBtn}>
            リセット
          </button>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading && <p>読み込み中...</p>}

      {!loading && (
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`${styles.sortable} ${sortKey === col.key ? styles.sortActive : ""}`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}{sortIndicator(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  データがありません
                </td>
              </tr>
            ) : (
              sorted.map((c) => (
                <tr
                  key={c.id}
                  className={styles.clickableRow}
                  onClick={() => window.location.href = `/admin/customers/${c.id}`}
                >
                  <td>{c.display_name ?? "-"}</td>
                  <td>{label(AGE_RANGE_LABELS, c.age_range)}</td>
                  <td>{label(GENDER_LABELS, c.gender)}</td>
                  <td>{c.concerns ? c.concerns.map((v) => label(CONCERN_LABELS, v)).join(", ") : "-"}</td>
                  <td>{formatDate(c.last_visit_at)}</td>
                  <td>{formatDate(c.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <div className={styles.nav}>
        <a href="/admin/debug">デバッグフォーム</a>
      </div>
    </div>
  );
}
