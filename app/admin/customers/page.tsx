"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`/api/customers?${params}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setCustomers(json.customers);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers("");
  }, [fetchCustomers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(search);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Customers</h1>

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <input
          type="text"
          placeholder="line_user_id or display_name で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchBtn}>
          検索
        </button>
        <button
          type="button"
          className={styles.searchBtn}
          onClick={() => {
            setSearch("");
            fetchCustomers("");
          }}
        >
          リセット
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}
      {loading && <p>Loading...</p>}

      {!loading && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>display_name</th>
              <th>line_user_id</th>
              <th>age_range</th>
              <th>gender</th>
              <th>concerns</th>
              <th>last_visit_at</th>
              <th>created_at</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  データがありません
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.display_name ?? "-"}</td>
                  <td>{c.line_user_id}</td>
                  <td>{c.age_range ?? "-"}</td>
                  <td>{c.gender ?? "-"}</td>
                  <td>{c.concerns ? c.concerns.join(", ") : "-"}</td>
                  <td>{c.last_visit_at ?? "-"}</td>
                  <td>{new Date(c.created_at).toLocaleString("ja-JP")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <div className={styles.nav}>
        <a href="/admin/debug">Debug Form へ</a>
      </div>
    </div>
  );
}
