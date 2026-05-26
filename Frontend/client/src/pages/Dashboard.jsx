import { useState } from "react";
import { useQuery } from "@apollo/client";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { GET_DASHBOARD, GET_RECENT_ACTIVITIES } from "../graphql";
import { shared, colors, statusColor, statusBg } from "../styles";
import Pagination, { paginate } from "../components/Pagination";

function getGreeting(h = new Date().getHours()) {
  //  h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

const PIE_COLORS = {
  Active: "#10b981",
  Planned: "#f59e0b",
  Completed: "#6b7280",
  Closed: "#ef4444",
  "Principal Investigator": "#0d9488",
  "Sub-Investigator": "#06b6d4",
};
function getColor(name) {
  return PIE_COLORS[name] || "#94a3b8";
}

const ACTION_ICONS = {
  CREATE: "🆕",
  ASSIGN: "🔗",
  UPDATE: "✏️",
  UNASSIGN: "🔓",
};
const ENTITY_ICONS = { study: "🧬", site: "🏥", examiner: "⚕️" };

function formatTime(createdAt) {
  const date = new Date(createdAt + "Z");
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 172800) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard({ user }) {
  const { data, loading, error } = useQuery(GET_DASHBOARD);
  const { data: actData } = useQuery(GET_RECENT_ACTIVITIES, {
    variables: { limit: 50 },
    // pollInterval: 10000,
  });
  const [distPage, setDistPage] = useState(1);
  const [actPage, setActPage] = useState(1);

  if (loading) return <p style={shared.page}>Loading dashboard...</p>;
  if (error) return <p style={shared.page}>Error: {error.message}</p>;

  const {
    totalStudies,
    activeSites,
    totalExaminers,
    studyByStatus,
    siteByStatus,
    examinerByRole,
    studySiteDistribution,
  } = data.dashboard;
  const { data: distItems, totalPages } = paginate(
    studySiteDistribution,
    distPage,
  );
  const activities = actData?.recentActivities || [];
  const { data: actItems, totalPages: actTotalPages } = paginate(
    activities,
    actPage,
  );

  return (
    <div style={shared.page}>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <div
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.85)",
              fontWeight: 500,
            }}
          >
            {getGreeting()},
          </div>
          <h1 style={styles.heroTitle}>{user.username} 👋</h1>
          <p style={styles.heroSub}>
            Here's your clinical network overview for today
          </p>
        </div>
        <div style={styles.heroArt}>
          <span style={{ fontSize: "64px" }}>🩺</span>
        </div>
      </div>

      {/* Pie charts — Studies by Status and Sites by Status side by side, Examiners by Role beside */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "20px",
          marginTop: "28px",
        }}
      >
        <PieCard
          title="Studies by Status"
          icon="🧬"
          total={totalStudies}
          subtitle="total"
          data={studyByStatus}
          color={colors.primary}
        />
        <PieCard
          title="Sites by Status"
          icon="🏥"
          total={activeSites}
          subtitle="active"
          data={siteByStatus}
          color={colors.success}
        />
        <PieCard
          title="Examiners by Role"
          icon="⚕️"
          total={totalExaminers}
          subtitle="total"
          data={examinerByRole}
          color={colors.accent}
        />
      </div>

      {/* Distribution table + Recent Activities side by side */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginTop: "28px",
        }}
      >
        {/* Distribution */}
        <div style={styles.tableCard}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", color: colors.text }}>
                📊 Study — Site Distribution
              </h3>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "13px",
                  color: colors.textLight,
                }}
              >
                Sites assigned per study
              </p>
            </div>
            <div
              style={{
                ...shared.badge,
                background: colors.primaryLight,
                color: colors.primaryDark,
              }}
            >
              {studySiteDistribution.length}
            </div>
          </div>
          <table style={shared.table}>
            <thead>
              <tr>
                <th style={shared.th}>Study</th>
                <th style={shared.th}>Phase</th>
                <th style={shared.th}>Status</th>
                <th style={shared.th}>Sites</th>
              </tr>
            </thead>
            <tbody>
              {distItems.map((d) => (
                <tr
                  key={d.studyName}
                  style={{ transition: "background 0.15s" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8fafc")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td style={{ ...shared.td, fontWeight: 500 }}>
                    {d.studyName}
                  </td>
                  <td style={shared.td}>
                    <span
                      style={{
                        ...shared.badge,
                        background: colors.accentLight,
                        color: colors.accent,
                      }}
                    >
                      {d.phase || "—"}
                    </span>
                  </td>
                  <td style={shared.td}>
                    <span
                      style={{
                        ...shared.badge,
                        background: statusBg(d.status),
                        color: statusColor(d.status),
                      }}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td
                    style={{
                      ...shared.td,
                      fontWeight: 600,
                      color: colors.primary,
                    }}
                  >
                    {d.siteCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={distPage}
            totalPages={totalPages}
            onPageChange={setDistPage}
          />
        </div>

        {/* Recent Activities */}
        <div style={styles.tableCard}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", color: colors.text }}>
                🕐 Recent Activities
              </h3>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "13px",
                  color: colors.textLight,
                }}
              >
                Latest actions across the network
              </p>
            </div>
            <div
              style={{
                ...shared.badge,
                background: colors.accentLight,
                color: colors.accent,
              }}
            >
              {activities.length} entries
            </div>
          </div>
          {activities.length === 0 ? (
            <p
              style={{
                color: colors.textLight,
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              No activities yet.
            </p>
          ) : (
            <>
              <table style={shared.table}>
                <thead>
                  <tr>
                    <th style={shared.th}>Action</th>
                    <th style={shared.th}>Entity</th>
                    <th style={shared.th}>Details</th>
                    <th style={shared.th}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {actItems.map((a) => {
                    const actionColor =
                      a.action === "CREATE"
                        ? colors.success
                        : a.action === "ASSIGN"
                          ? colors.primary
                          : a.action === "UPDATE"
                            ? colors.warning
                            : a.action === "UNASSIGN"
                              ? "#dc2626"
                              : colors.grey;
                    return (
                      <tr
                        key={a.id}
                        style={{ transition: "background 0.15s" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f8fafc")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td style={shared.td}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span style={{ fontSize: "14px" }}>
                              {ACTION_ICONS[a.action] || "📝"}
                            </span>
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: actionColor,
                              }}
                            >
                              {a.action}
                            </span>
                          </div>
                        </td>
                        <td style={shared.td}>
                          <span
                            style={{
                              ...shared.badge,
                              background: colors.primaryLight,
                              color: colors.primaryDark,
                              fontSize: "10px",
                            }}
                          >
                            {ENTITY_ICONS[a.entity] || ""} {a.entity}
                          </span>
                        </td>
                        <td
                          style={{
                            ...shared.td,
                            fontSize: "12px",
                            maxWidth: "200px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={a.details}
                        >
                          {a.details}
                        </td>
                        <td
                          style={{
                            ...shared.td,
                            fontSize: "11px",
                            color: colors.greyLight,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatTime(a.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination
                page={actPage}
                totalPages={actTotalPages}
                onPageChange={setActPage}
              />
            </>
          )}
        </div>
      </div>

      {/* Quick info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "20px",
          marginTop: "24px",
        }}
      >
        <div style={styles.infoCard}>
          <span style={{ fontSize: "32px" }}>💡</span>
          <div>
            <h4
              style={{
                margin: "0 0 4px",
                color: colors.text,
                fontSize: "14px",
              }}
            >
              Quick Tip
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: colors.textLight }}>
              Sites must have at least one assigned examiner to be marked as
              Active.
            </p>
          </div>
        </div>
        <div style={styles.infoCard}>
          <span style={{ fontSize: "32px" }}>🔍</span>
          <div>
            <h4
              style={{
                margin: "0 0 4px",
                color: colors.text,
                fontSize: "14px",
              }}
            >
              Global Search
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: colors.textLight }}>
              Use the Search page to find studies, sites, or examiners
              instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PieCard({ title, icon, total, subtitle, data, color }) {
  return (
    <div style={styles.chartCard}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "4px",
        }}
      >
        <span style={{ fontSize: "20px" }}>{icon}</span>
        <span style={{ fontSize: "15px", fontWeight: 600, color: colors.text }}>
          {title}
        </span>
      </div>
      <div style={{ textAlign: "center" }}>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={72}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={getColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                fontSize: "13px",
                border: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            fontSize: "28px",
            fontWeight: 800,
            color,
            marginTop: "-8px",
          }}
        >
          {total}{" "}
          <span
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: colors.textLight,
            }}
          >
            {subtitle}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  hero: {
    background: colors.gradient,
    borderRadius: "18px",
    padding: "36px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 8px 30px rgba(13, 148, 136, 0.2)",
  },
  heroContent: { color: "#fff" },
  heroTitle: {
    fontSize: "28px",
    fontWeight: 800,
    margin: "4px 0 8px",
    color: "#fff",
  },
  heroSub: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.8)",
    fontWeight: 400,
  },
  heroArt: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  chartCard: {
    background: colors.card,
    borderRadius: "16px",
    padding: "20px",
    border: `1px solid ${colors.border}`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  tableCard: {
    background: colors.card,
    borderRadius: "16px",
    padding: "24px",
    border: `1px solid ${colors.border}`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  activityItem: {
    padding: "12px 0",
    borderBottom: `1px solid ${colors.border}`,
  },
  infoCard: {
    background: colors.card,
    borderRadius: "14px",
    padding: "20px 24px",
    border: `1px solid ${colors.border}`,
    display: "flex",
    gap: "16px",
    alignItems: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
  },
};
