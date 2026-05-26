import { useState, useEffect } from "react";
import { useLazyQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { SEARCH } from "../graphql";
import { shared, statusColor, statusBg, colors } from "../styles";

const phases = ["", "Phase I", "Phase II", "Phase III", "Phase IV"];
const statuses = ["", "Planned", "Active", "Completed", "Closed"];

export default function Search() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState("");
  const [status, setStatus] = useState("");
  const [search, { data, loading }] = useLazyQuery(SEARCH, { fetchPolicy: "network-only" });
  const [cleared, setCleared] = useState(false);
  const navigate = useNavigate();

  const doSearch = () => {
    const trimmed = query.trim();
    setCleared(false);
    search({ variables: { query: trimmed || "%", phase: phase || null, status: status || null } });
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length > 0) {
      setCleared(false);
      const timer = setTimeout(() => doSearch(), 300);
      return () => clearTimeout(timer);
    }
  }, [query]);

  const clearAll = () => {
    setQuery("");
    setPhase("");
    setStatus("");
    setCleared(true);
  };

  const results = cleared ? null : data;
  const hasResults = results && (results.search.studies.length || results.search.sites.length || results.search.examiners.length);
  const showNoResults = results && !hasResults && query.trim().length > 0;

  const clickStyle = { ...shared.td, cursor: "pointer", color: colors.primary, fontWeight: 500 };

  return (
    <div style={shared.page}>
      <h2 style={{ margin: "0 0 4px" }}>🔍 Search</h2>
      <p style={{ margin: "0 0 20px", fontSize: "14px", color: colors.textLight }}>Find studies, sites, and examiners across the network</p>

      <div style={styles.searchCard}>
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Start typing to search..."
          style={styles.searchInput}
          autoFocus
        />
        <div style={styles.filters}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Phase</label>
            <select value={phase} onChange={(e) => setPhase(e.target.value)} style={styles.select}>
              <option value="">All Phases</option>
              {phases.filter(Boolean).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
              <option value="">All Statuses</option>
              {statuses.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button type="button" onClick={doSearch} style={styles.submitBtn}>🔍 Search</button>
          {(phase || status || query) && (
            <button type="button" onClick={clearAll} style={styles.clearBtn}>✕ Clear</button>
          )}
        </div>
      </div>

      {loading && <p style={{ color: colors.textLight, marginTop: "16px" }}>Searching...</p>}

      {showNoResults && (
        <div style={styles.noResults}>
          <span style={{ fontSize: "36px" }}>🔎</span>
          <p style={{ margin: "8px 0 0", color: colors.textLight }}>No results found for "<strong>{query}</strong>"</p>
        </div>
      )}

      {results?.search.studies.length > 0 && (
        <div style={styles.resultCard}>
          <h3 style={styles.resultTitle}>🧬 Studies <span style={styles.countBadge}>{results.search.studies.length}</span></h3>
          <table style={shared.table}>
            <thead><tr><th style={shared.th}>Name</th><th style={shared.th}>Sponsor</th><th style={shared.th}>Phase</th><th style={shared.th}>Status</th></tr></thead>
            <tbody>
              {results.search.studies.map((s) => (
                <tr key={s.id} style={styles.row} onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={clickStyle} onClick={() => navigate("/studies", { state: { selectedId: s.id } })}>{s.name}</td>
                  <td style={shared.td}>{s.sponsor}</td>
                  <td style={shared.td}><span style={{ ...shared.badge, background: colors.accentLight, color: colors.accent }}>{s.phase}</span></td>
                  <td style={shared.td}><span style={{ ...shared.badge, background: statusBg(s.status), color: statusColor(s.status) }}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results?.search.sites.length > 0 && (
        <div style={styles.resultCard}>
          <h3 style={styles.resultTitle}>🏥 Sites <span style={styles.countBadge}>{results.search.sites.length}</span></h3>
          <table style={shared.table}>
            <thead><tr><th style={shared.th}>Name</th><th style={shared.th}>City</th><th style={shared.th}>Country</th><th style={shared.th}>Status</th></tr></thead>
            <tbody>
              {results.search.sites.map((s) => (
                <tr key={s.id} style={styles.row} onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={clickStyle} onClick={() => navigate("/sites", { state: { selectedId: s.id } })}>{s.name}</td>
                  <td style={shared.td}>{s.city}</td>
                  <td style={shared.td}>{s.country}</td>
                  <td style={shared.td}><span style={{ ...shared.badge, background: statusBg(s.status), color: statusColor(s.status) }}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results?.search.examiners.length > 0 && (
        <div style={styles.resultCard}>
          <h3 style={styles.resultTitle}>⚕️ Examiners <span style={styles.countBadge}>{results.search.examiners.length}</span></h3>
          <table style={shared.table}>
            <thead><tr><th style={shared.th}>Name</th><th style={shared.th}>Role</th></tr></thead>
            <tbody>
              {results.search.examiners.map((e) => (
                <tr key={e.id} style={styles.row} onMouseEnter={(ev) => (ev.currentTarget.style.background = "#f8fafc")} onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}>
                  <td style={clickStyle} onClick={() => navigate("/examiners", { state: { selectedId: e.id } })}>{e.name}</td>
                  <td style={shared.td}>{e.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!results && !loading && query.trim().length === 0 && !cleared && (
        <div style={styles.emptyState}>
          <span style={{ fontSize: "48px" }}>🔍</span>
          <h3 style={{ margin: "12px 0 4px", color: colors.text }}>Search the network</h3>
          <p style={{ color: colors.textLight, fontSize: "14px" }}>Type a keyword to search across studies, sites, and examiners</p>
        </div>
      )}

      {cleared && (
        <div style={styles.emptyState}>
          <span style={{ fontSize: "48px" }}>🔍</span>
          <h3 style={{ margin: "12px 0 4px", color: colors.text }}>Search the network</h3>
          <p style={{ color: colors.textLight, fontSize: "14px" }}>Type a keyword to search across studies, sites, and examiners</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  searchCard: {
    background: colors.card, borderRadius: "14px", padding: "20px 24px",
    border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  searchInput: {
    width: "100%", padding: "14px 18px", fontSize: "16px",
    border: `2px solid ${colors.border}`, borderRadius: "10px", outline: "none",
    transition: "border 0.2s", boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif",
  },
  filters: { display: "flex", gap: "12px", marginTop: "14px", alignItems: "flex-end", flexWrap: "wrap" },
  filterGroup: { display: "flex", flexDirection: "column", gap: "4px" },
  filterLabel: { fontSize: "12px", fontWeight: 600, color: colors.textLight, textTransform: "uppercase", letterSpacing: "0.5px" },
  select: {
    padding: "9px 14px", fontSize: "13px", border: `1px solid ${colors.border}`,
    borderRadius: "8px", outline: "none", background: colors.card, color: colors.text,
    cursor: "pointer", fontFamily: "'Inter', sans-serif", minWidth: "140px",
  },
  submitBtn: {
    padding: "9px 20px", fontSize: "14px", border: "none", borderRadius: "8px",
    background: colors.gradient, color: "#fff", cursor: "pointer", fontWeight: 600,
    fontFamily: "'Inter', sans-serif", boxShadow: "0 2px 8px rgba(13, 148, 136, 0.25)",
    whiteSpace: "nowrap",
  },
  clearBtn: {
    padding: "9px 14px", fontSize: "13px", border: "none", borderRadius: "8px",
    background: "#fef2f2", color: "#ef4444", cursor: "pointer", fontWeight: 500,
    fontFamily: "'Inter', sans-serif",
  },
  resultCard: {
    background: colors.card, borderRadius: "14px", padding: "20px 24px",
    border: `1px solid ${colors.border}`, marginTop: "18px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
  },
  resultTitle: { margin: "0 0 12px", fontSize: "16px", color: colors.text, display: "flex", alignItems: "center", gap: "8px" },
  countBadge: {
    background: colors.primaryLight, color: colors.primaryDark,
    padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
  },
  row: { transition: "background 0.15s" },
  noResults: { textAlign: "center", padding: "40px 0" },
  emptyState: { textAlign: "center", padding: "60px 0" },
};
