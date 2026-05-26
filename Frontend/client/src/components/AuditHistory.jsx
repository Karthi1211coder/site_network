import { useQuery } from "@apollo/client";
import { GET_AUDIT_LOGS } from "../graphql";
import { colors } from "../styles";

const ACTION_META = {
  CREATE: { icon: "🟢", color: "#10b981", label: "Created" },
  UPDATE: { icon: "🔵", color: "#3b82f6", label: "Updated" },
  ASSIGN: { icon: "🔗", color: "#8b5cf6", label: "Assigned" },
  UNASSIGN: { icon: "🔴", color: "#ef4444", label: "Unassigned" },
};

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function AuditHistory({ entity, entityId, entityName, onClose }) {
  const { data, loading, error } = useQuery(GET_AUDIT_LOGS, {
    variables: { entity, entityId },
    fetchPolicy: "network-only",
  });

  const logs = data?.auditLogs || [];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>📜 Audit History</h3>
            <p style={styles.subtitle}>{entityName}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          {loading && <p style={styles.empty}>Loading...</p>}
          {error && <p style={styles.empty}>Error: {error.message}</p>}
          {!loading && logs.length === 0 && <p style={styles.empty}>No audit history found.</p>}

          {logs.map((log, i) => {
            const meta = ACTION_META[log.action] || { icon: "⚪", color: colors.textLight, label: log.action };
            return (
              <div key={log.id} style={styles.entry}>
                <div style={styles.timeline}>
                  <div style={{ ...styles.dot, background: meta.color }}>{meta.icon}</div>
                  {i < logs.length - 1 && <div style={styles.line} />}
                </div>
                <div style={styles.content}>
                  <div style={styles.entryHeader}>
                    <span style={{ ...styles.actionBadge, background: meta.color + "18", color: meta.color }}>{meta.label}</span>
                    <span style={styles.time}>{formatDate(log.createdAt)}</span>
                  </div>
                  <p style={styles.details}>{log.details}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 250,
  },
  modal: {
    background: "#fff", borderRadius: "16px", width: "520px",
    maxHeight: "80vh", display: "flex", flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "24px 28px 16px", borderBottom: `1px solid ${colors.border}`,
  },
  title: { margin: 0, fontSize: "18px", fontWeight: 700, color: colors.text },
  subtitle: { margin: "4px 0 0", fontSize: "13px", color: colors.textLight },
  closeBtn: {
    background: "none", border: `1px solid ${colors.border}`, borderRadius: "8px",
    width: "32px", height: "32px", fontSize: "16px", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", color: colors.text,
  },
  body: { padding: "20px 28px", overflowY: "auto", flex: 1 },
  empty: { color: colors.textLight, fontSize: "14px", textAlign: "center", padding: "20px 0" },
  entry: { display: "flex", gap: "14px", minHeight: "60px" },
  timeline: { display: "flex", flexDirection: "column", alignItems: "center", width: "28px", flexShrink: 0 },
  dot: {
    width: "28px", height: "28px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px",
  },
  line: { width: "2px", flex: 1, background: colors.border, marginTop: "4px" },
  content: { flex: 1, paddingBottom: "20px" },
  entryHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" },
  actionBadge: {
    padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600,
  },
  time: { fontSize: "11px", color: colors.greyLight },
  details: { margin: 0, fontSize: "13px", color: colors.text, lineHeight: "1.5" },
};
