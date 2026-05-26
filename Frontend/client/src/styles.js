export const colors = {
  primary: "#0d9488",
  primaryDark: "#0f766e",
  primaryLight: "#ccfbf1",
  accent: "#06b6d4",
  accentLight: "#cffafe",
  success: "#10b981",
  successLight: "#d1fae5",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  danger: "#ef4444",
  grey: "#6b7280",
  greyLight: "#9ca3af",
  bg: "#f0fdfa",
  card: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
  gradient: "linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)",
  gradientSubtle: "linear-gradient(135deg, #f0fdfa 0%, #cffafe 100%)",
};

export function statusColor(status) {
  if (status === "Active") return colors.success;
  if (status === "Completed" || status === "Closed") return colors.grey;
  if (status === "Removed") return "#dc2626";
  return colors.warning;
}

export function statusBg(status) {
  if (status === "Active") return colors.successLight;
  if (status === "Completed" || status === "Closed") return "#f3f4f6";
  if (status === "Removed") return "#fef2f2";
  return colors.warningLight;
}

export const shared = {
  page: { padding: "28px 32px", maxWidth: "1200px", margin: "0 auto", fontFamily: "'Inter', sans-serif" },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "18px", marginTop: "18px" },
  card: {
    background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "14px",
    padding: "22px", cursor: "pointer", transition: "all 0.25s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  cardTitle: { margin: "0 0 8px", fontSize: "16px", fontWeight: 600, color: colors.text },
  cardSub: { margin: "4px 0", fontSize: "13px", color: colors.textLight },
  badge: { display: "inline-block", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "12px", borderRadius: "12px", overflow: "hidden" },
  th: { textAlign: "left", padding: "12px 14px", borderBottom: `2px solid ${colors.border}`, background: colors.primaryLight, fontSize: "12px", color: colors.primaryDark, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" },
  td: { padding: "12px 14px", borderBottom: `1px solid ${colors.border}`, fontSize: "14px", color: colors.text },
  backBtn: { background: "none", border: "none", color: colors.primary, cursor: "pointer", fontSize: "14px", padding: 0, marginBottom: "16px", fontWeight: 500 },
  pagination: { display: "flex", gap: "8px", justifyContent: "center", marginTop: "28px", alignItems: "center" },
  pageBtn: { padding: "8px 16px", border: `1px solid ${colors.border}`, borderRadius: "8px", cursor: "pointer", background: colors.card, fontSize: "13px", fontWeight: 500, transition: "all 0.2s" },
  pageBtnActive: { padding: "8px 16px", border: `1px solid ${colors.primary}`, borderRadius: "8px", cursor: "pointer", background: colors.primary, color: "#fff", fontSize: "13px", fontWeight: 600 },
};
