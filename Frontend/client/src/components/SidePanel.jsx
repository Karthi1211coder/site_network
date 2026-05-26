import { useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { GET_STUDY, GET_SITE, GET_EXAMINER } from "../graphql";
import { colors, statusColor } from "../styles";

const PIE_COLORS = {
  Active: "#10b981", Planned: "#f59e0b", Completed: "#6b7280", Closed: "#ef4444",
  "Principal Investigator": "#0d9488", "Sub-Investigator": "#06b6d4",
};
const getColor = (name) => PIE_COLORS[name] || "#94a3b8";

export default function SidePanel({ open, onClose, entityType, entityId }) {
  const [stack, setStack] = useState([]);

  useEffect(() => {
    if (open && entityType && entityId) {
      setStack([{ type: entityType, id: entityId }]);
    }
    if (!open) setStack([]);
  }, [open, entityType, entityId]);

  if (!open || stack.length === 0) return null;

  const current = stack[stack.length - 1];

  const pushEntity = (type, id) => setStack((s) => [...s, { type, id }]);
  const popOrClose = () => {
    if (stack.length > 1) setStack((s) => s.slice(0, -1));
    else onClose();
  };

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.panel}>
        <div style={styles.header}>
          <button onClick={popOrClose} style={styles.closeBtn}>
            {stack.length > 1 ? "←" : "✕"}
          </button>
          {stack.length > 1 && (
            <button onClick={onClose} style={{ ...styles.closeBtn, marginLeft: "auto" }}>✕</button>
          )}
        </div>
        <PanelContent type={current.type} id={current.id} onNavigate={pushEntity} />
      </div>
    </>
  );
}

function PanelContent({ type, id, onNavigate }) {
  if (type === "study") return <StudyPanel id={id} onNavigate={onNavigate} />;
  if (type === "site") return <SitePanel id={id} onNavigate={onNavigate} />;
  if (type === "examiner") return <ExaminerPanel id={id} onNavigate={onNavigate} />;
  return null;
}

function StudyPanel({ id, onNavigate }) {
  const { data, loading } = useQuery(GET_STUDY, { variables: { id } });
  const [tab, setTab] = useState("overview");
  if (loading) return <p style={styles.loading}>Loading...</p>;
  const s = data?.study;
  if (!s) return <p style={styles.loading}>Not found</p>;

  const siteStatusData = buildStatusCounts(s.sites);
  const examinerRoleData = buildRoleCounts(s.examiners);

  const tabs = [
    { key: "overview", icon: "📊", label: "Overview" },
    { key: "sites", icon: "🏥", label: `Sites (${s.sites.length})` },
    { key: "examiners", icon: "⚕️", label: `Examiners (${s.examiners.length})` },
  ];

  return (
    <div>
      <h3 style={styles.title}>{s.name}</h3>
      <span style={{ ...styles.badge, backgroundColor: statusColor(s.status) }}>{s.status}</span>
      <TabBar tabs={tabs} active={tab} onChange={setTab} />
      {tab === "overview" && (
        <div>
          <InfoRow label="Sponsor" value={s.sponsor} />
          <InfoRow label="Phase" value={s.phase} />
          <InfoRow label="Protocol ID" value={s.protocolId} />
          <InfoRow label="Start Date" value={s.startDate} />
          <InfoRow label="End Date" value={s.endDate} />
          {(s.sites.length > 0 || s.examiners.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {s.sites.length > 0 && <MiniPie title="Sites by Status" data={siteStatusData} icon="🏥" accentColor={colors.success} />}
              {s.examiners.length > 0 && <MiniPie title="Examiners by Role" data={examinerRoleData} icon="⚕️" accentColor={colors.accent} />}
            </div>
          )}
        </div>
      )}
      {tab === "sites" && (
        <EntityList items={s.sites} type="site" onNavigate={onNavigate}
          render={(si) => (
            <>
              <div style={styles.itemName}>{si.name}</div>
              <div style={styles.itemSub}>📍 {si.city}, {si.country}</div>
              <span style={{ ...styles.badge, backgroundColor: statusColor(si.status), fontSize: "10px" }}>{si.status}</span>
            </>
          )}
        />
      )}
      {tab === "examiners" && (
        <EntityList items={s.examiners} type="examiner" onNavigate={onNavigate}
          render={(e) => (
            <>
              <div style={styles.itemName}>{e.name}</div>
              <span style={{ ...styles.badge, backgroundColor: e.role === "Principal Investigator" ? colors.primary : colors.textLight, fontSize: "10px" }}>{e.role}</span>
            </>
          )}
        />
      )}
    </div>
  );
}

function SitePanel({ id, onNavigate }) {
  const { data, loading } = useQuery(GET_SITE, { variables: { id } });
  const [tab, setTab] = useState("overview");
  if (loading) return <p style={styles.loading}>Loading...</p>;
  const s = data?.site;
  if (!s) return <p style={styles.loading}>Not found</p>;

  const studyStatusData = buildStatusCounts(s.studies);
  const examinerRoleData = buildRoleCounts(s.examiners);

  const tabs = [
    { key: "overview", icon: "📊", label: "Overview" },
    { key: "studies", icon: "🧬", label: `Studies (${s.studies.length})` },
    { key: "examiners", icon: "⚕️", label: `Examiners (${s.examiners.length})` },
  ];

  return (
    <div>
      <h3 style={styles.title}>{s.name}</h3>
      <span style={{ ...styles.badge, backgroundColor: statusColor(s.status) }}>{s.status}</span>
      <TabBar tabs={tabs} active={tab} onChange={setTab} />
      {tab === "overview" && (
        <div>
          <InfoRow label="City" value={s.city} />
          <InfoRow label="Country" value={s.country} />
          {(s.studies.length > 0 || s.examiners.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {s.studies.length > 0 && <MiniPie title="Studies by Status" data={studyStatusData} icon="🧬" accentColor={colors.primary} />}
              {s.examiners.length > 0 && <MiniPie title="Examiners by Role" data={examinerRoleData} icon="⚕️" accentColor={colors.accent} />}
            </div>
          )}
        </div>
      )}
      {tab === "studies" && (
        <EntityList items={s.studies} type="study" onNavigate={onNavigate}
          render={(st) => (
            <>
              <div style={styles.itemName}>{st.name}</div>
              <div style={styles.itemSub}>{st.sponsor} · {st.phase}</div>
              <span style={{ ...styles.badge, backgroundColor: statusColor(st.status), fontSize: "10px" }}>{st.status}</span>
            </>
          )}
        />
      )}
      {tab === "examiners" && (
        <EntityList items={s.examiners} type="examiner" onNavigate={onNavigate}
          render={(e) => (
            <>
              <div style={styles.itemName}>{e.name}</div>
              <span style={{ ...styles.badge, backgroundColor: e.role === "Principal Investigator" ? colors.primary : colors.textLight, fontSize: "10px" }}>{e.role}</span>
            </>
          )}
        />
      )}
    </div>
  );
}

function ExaminerPanel({ id, onNavigate }) {
  const { data, loading } = useQuery(GET_EXAMINER, { variables: { id } });
  const [tab, setTab] = useState("overview");
  if (loading) return <p style={styles.loading}>Loading...</p>;
  const e = data?.examiner;
  if (!e) return <p style={styles.loading}>Not found</p>;

  const siteStatusData = buildStatusCounts(e.sites);
  const studyStatusData = buildStatusCounts(e.studies);

  const tabs = [
    { key: "overview", icon: "📊", label: "Overview" },
    { key: "sites", icon: "🏥", label: `Sites (${e.sites.length})` },
    { key: "studies", icon: "🧬", label: `Studies (${e.studies.length})` },
    { key: "certs", icon: "📄", label: `Certs (${e.certificates?.length || 0})` },
  ];

  return (
    <div>
      <h3 style={styles.title}>{e.name}</h3>
      <span style={{ ...styles.badge, backgroundColor: e.role === "Principal Investigator" ? colors.primary : colors.textLight }}>{e.role}</span>
      <TabBar tabs={tabs} active={tab} onChange={setTab} />
      {tab === "overview" && (
        <div>
          <InfoRow label="Role" value={e.role} />
          {(e.sites.length > 0 || e.studies.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {e.sites.length > 0 && <MiniPie title="Sites by Status" data={siteStatusData} icon="🏥" accentColor={colors.success} />}
              {e.studies.length > 0 && <MiniPie title="Studies by Status" data={studyStatusData} icon="🧬" accentColor={colors.primary} />}
            </div>
          )}
        </div>
      )}
      {tab === "sites" && (
        <EntityList items={e.sites} type="site" onNavigate={onNavigate}
          render={(si) => (
            <>
              <div style={styles.itemName}>{si.name}</div>
              <div style={styles.itemSub}>📍 {si.city}, {si.country}</div>
              <span style={{ ...styles.badge, backgroundColor: statusColor(si.status), fontSize: "10px" }}>{si.status}</span>
            </>
          )}
        />
      )}
      {tab === "studies" && (
        <EntityList items={e.studies} type="study" onNavigate={onNavigate}
          render={(st) => (
            <>
              <div style={styles.itemName}>{st.name}</div>
              <div style={styles.itemSub}>{st.sponsor} · {st.phase}</div>
              <span style={{ ...styles.badge, backgroundColor: statusColor(st.status), fontSize: "10px" }}>{st.status}</span>
            </>
          )}
        />
      )}
      {tab === "certs" && (
        <div style={{ marginTop: "12px" }}>
          {(!e.certificates || e.certificates.length === 0) ? <p style={{ color: colors.textLight, fontSize: "13px" }}>No certificates.</p> :
            e.certificates.map((c) => {
              let bg = "#10b981", label = c.status;
              if (c.status === "Expired") bg = "#dc2626";
              else if (c.status === "Expiring Soon") bg = "#f59e0b";
              return (
                <div key={c.id} style={{ ...styles.listItem, cursor: "default" }}>
                  <div style={styles.itemName}>{c.studyName}</div>
                  <div style={styles.itemSub}>Expires: {c.expiryDate}</div>
                  <span style={{ ...styles.badge, backgroundColor: bg, fontSize: "10px" }}>{label}{c.daysLeft > 0 ? ` (${c.daysLeft}d)` : ""}</span>
                </div>
              );
            })
          }
        </div>
      )}
    </div>
  );
}

// --- Shared sub-components ---

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={styles.tabBar}>
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)}
          style={t.key === active ? { ...styles.tab, ...styles.tabActive } : styles.tab}>
          <span>{t.icon}</span> {t.label}
        </button>
      ))}
    </div>
  );
}

function EntityList({ items, type, onNavigate, render }) {
  if (items.length === 0) return <p style={{ color: colors.textLight, fontSize: "13px", marginTop: "16px" }}>None assigned.</p>;
  return (
    <div style={{ marginTop: "12px" }}>
      {items.map((item) => (
        <div key={item.id} style={styles.listItem} onClick={() => onNavigate(type, item.id)}
          onMouseEnter={(e) => (e.currentTarget.style.background = colors.primaryLight)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
          {render(item)}
        </div>
      ))}
    </div>
  );
}

function MiniPie({ title, data, icon, accentColor }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const clr = accentColor || colors.primary;
  return (
    <div style={styles.pieSection}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        {icon && <span style={{ fontSize: "16px" }}>{icon}</span>}
        <span style={{ fontSize: "13px", fontWeight: 600, color: colors.text }}>{title}</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} strokeWidth={0}>
              {data.map((entry) => <Cell key={entry.name} fill={getColor(entry.name)} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px" }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ fontSize: "24px", fontWeight: 800, color: clr, marginTop: "-4px" }}>
          {total} <span style={{ fontSize: "12px", fontWeight: 500, color: colors.textLight }}>total</span>
        </div>
      </div>
      <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {data.map((d) => (
          <div key={d.name} style={styles.countChip}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: getColor(d.name), flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: colors.textLight }}>{d.name}</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: colors.text }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value || "—"}</span>
    </div>
  );
}

// --- Helpers ---

function buildStatusCounts(items) {
  const map = {};
  items.forEach((i) => { const k = i.status || "Unknown"; map[k] = (map[k] || 0) + 1; });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function buildRoleCounts(items) {
  const map = {};
  items.forEach((i) => { const k = i.role || "Unknown"; map[k] = (map[k] || 0) + 1; });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

// --- Styles ---

const styles = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 300,
  },
  panel: {
    position: "fixed", top: 0, left: 0, width: "50%", height: "100vh",
    background: "#fff", zIndex: 301, boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
    overflowY: "auto", padding: "24px 28px",
    animation: "slideIn 0.25s ease-out",
  },
  header: {
    display: "flex", alignItems: "center", marginBottom: "16px",
  },
  closeBtn: {
    background: "none", border: `1px solid ${colors.border}`, borderRadius: "8px",
    width: "36px", height: "36px", fontSize: "18px", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", color: colors.text,
  },
  title: { margin: "0 0 8px", fontSize: "20px", fontWeight: 700, color: colors.text },
  badge: {
    display: "inline-block", padding: "4px 12px", borderRadius: "20px",
    fontSize: "11px", fontWeight: 600, color: "#fff",
  },
  tabBar: {
    display: "flex", gap: "4px", marginTop: "20px", marginBottom: "16px",
    borderBottom: `2px solid ${colors.border}`, paddingBottom: "0",
  },
  tab: {
    background: "none", border: "none", padding: "10px 14px", cursor: "pointer",
    fontSize: "13px", fontWeight: 500, color: colors.textLight,
    borderBottom: "2px solid transparent", marginBottom: "-2px",
    display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s",
  },
  tabActive: {
    color: colors.primary, fontWeight: 600, borderBottomColor: colors.primary,
  },
  listItem: {
    padding: "14px 16px", borderRadius: "10px", border: `1px solid ${colors.border}`,
    marginBottom: "8px", cursor: "pointer", transition: "background 0.15s",
  },
  itemName: { fontSize: "14px", fontWeight: 600, color: colors.text, marginBottom: "2px" },
  itemSub: { fontSize: "12px", color: colors.textLight, marginBottom: "4px" },
  pieSection: {
    marginTop: "20px", background: "#f8fafc", borderRadius: "12px", padding: "16px",
  },
  infoRow: {
    display: "flex", justifyContent: "space-between", padding: "10px 0",
    borderBottom: `1px solid ${colors.border}`,
  },
  infoLabel: { fontSize: "13px", fontWeight: 600, color: colors.textLight },
  infoValue: { fontSize: "13px", color: colors.text },
  loading: { padding: "20px", color: colors.textLight, fontSize: "14px" },
  countChip: {
    display: "flex", alignItems: "center", gap: "6px",
    background: "#fff", border: `1px solid ${colors.border}`, borderRadius: "8px",
    padding: "6px 10px",
  },
};
