import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useLocation, useNavigate } from "react-router-dom";
import { GET_STUDIES, GET_STUDY, CREATE_STUDY, UPDATE_STUDY, UNASSIGN_SITE_FROM_STUDY, REASSIGN_SITE_TO_STUDY } from "../graphql";
import { shared, statusColor, colors } from "../styles";
import Pagination from "../components/Pagination";
import Toast from "../components/Toast";
import SidePanel from "../components/SidePanel";
import AuditHistory from "../components/AuditHistory";

export default function Studies({ isAdmin }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (location.state?.selectedId) {
      setSelectedId(location.state.selectedId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  if (selectedId) return <StudyDetail id={selectedId} onBack={() => setSelectedId(null)} isAdmin={isAdmin} setToast={setToast} />;
  return (
    <>
      <StudyList page={page} setPage={setPage} onSelect={setSelectedId} isAdmin={isAdmin} onCreate={() => setShowCreate(true)} />
      {showCreate && <CreateStudyModal onClose={() => setShowCreate(false)} onSuccess={(m) => { setShowCreate(false); setToast(m); }} />}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

function StudyList({ page, setPage, onSelect, isAdmin, onCreate }) {
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState("");
  const [status, setStatus] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setSearchDebounced(search), 300); return () => clearTimeout(t); }, [search]);
  const vars = { page, limit: 10, search: searchDebounced || null, phase: phase || null, status: status || null };
  const { data, loading, error } = useQuery(GET_STUDIES, { variables: vars, fetchPolicy: "cache-and-network" });
  if (loading && !data) return <p style={shared.page}>Loading...</p>;
  if (error) return <p style={shared.page}>Error: {error.message}</p>;
  const items = data?.studies?.data || [];
  const totalPages = data?.studies?.totalPages || 1;
  const totalCount = data?.studies?.totalCount || 0;
  const hasFilters = search || phase || status;
  const clearAll = () => { setSearch(""); setPhase(""); setStatus(""); setPage(1); };
  return (
    <div style={shared.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2>Studies</h2>{isAdmin && <button onClick={onCreate} style={btnStyle}>＋ Create Study</button>}</div>
      <div style={filterCard}>
        <div style={filterRow}>
          <div style={{ ...searchBarStyle, flex: 1 }}>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, sponsor, protocol..." style={searchInputStyle} />
            {search && <button onClick={() => { setSearch(""); setPage(1); }} style={searchClearStyle}>✕</button>}
          </div>
          <select value={phase} onChange={(e) => { setPhase(e.target.value); setPage(1); }} style={selectStyle}>
            <option value="">All Phases</option>
            <option>Phase I</option><option>Phase II</option><option>Phase III</option><option>Phase IV</option>
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={selectStyle}>
            <option value="">All Statuses</option>
            <option>Planned</option><option>Active</option><option>Completed</option>
          </select>
          {hasFilters && <button onClick={clearAll} style={clearFilterBtn}>✕ Clear</button>}
          {hasFilters && <span style={resultCount}>{totalCount} found</span>}
        </div>
      </div>
      <div style={shared.cardGrid}>{items.map((s) => (
        <div key={s.id} style={shared.card} onClick={() => onSelect(s.id)} onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
          <h3 style={shared.cardTitle}>{s.name}</h3>
          <p style={shared.cardSub}>Sponsor: {s.sponsor || "—"} · Phase: {s.phase || "—"}</p>
          <p style={shared.cardSub}>Protocol: {s.protocolId || "—"}</p>
          <span style={{ ...shared.badge, backgroundColor: statusColor(s.status) }}>{s.status}</span>
        </div>))}</div>
      {items.length === 0 && hasFilters && <p style={{ textAlign: "center", color: colors.textLight, marginTop: "24px" }}>No studies match your filters</p>}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={overlay}>
      <div style={modal}>
        <p style={{ margin: "0 0 20px", fontSize: "14px", color: colors.text }}>{message}</p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={cancelBtn}>Cancel</button>
          <button onClick={onConfirm} style={{ ...btnStyle, background: "#dc2626" }}>Unassign</button>
        </div>
      </div>
    </div>
  );
}

function StudyDetail({ id, onBack, isAdmin, setToast }) {
  const { data, loading, error, refetch } = useQuery(GET_STUDY, { variables: { id } });
  const [showEdit, setShowEdit] = useState(false);
  const [unassignSite] = useMutation(UNASSIGN_SITE_FROM_STUDY);
  const [reassignSite] = useMutation(REASSIGN_SITE_TO_STUDY);
  const [panel, setPanel] = useState({ open: false, type: null, id: null });
  const [showHistory, setShowHistory] = useState(false);
  const [confirmSiteId, setConfirmSiteId] = useState(null);
  if (loading) return <p style={shared.page}>Loading...</p>;
  if (error) return <p style={shared.page}>Error: {error.message}</p>;
  const s = data.study;
  return (
    <div style={shared.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={shared.backBtn}>← Back to Studies</button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setShowHistory(true)} style={historyBtn}>📜 History</button>
          {isAdmin && <button onClick={() => setShowEdit(true)} style={editBtn}>✏️ Edit</button>}
        </div>
      </div>
      <h2>{s.name}</h2><span style={{ ...shared.badge, backgroundColor: statusColor(s.status) }}>{s.status}</span>
      <table style={{ ...shared.table, marginTop: "20px" }}><tbody>
        <tr><td style={tdL}>Sponsor</td><td style={shared.td}>{s.sponsor || "—"}</td></tr>
        <tr><td style={tdL}>Phase</td><td style={shared.td}>{s.phase || "—"}</td></tr>
        <tr><td style={tdL}>Protocol ID</td><td style={shared.td}>{s.protocolId || "—"}</td></tr>
        <tr><td style={tdL}>Start Date</td><td style={shared.td}>{s.startDate || "—"}</td></tr>
        <tr><td style={tdL}>End Date</td><td style={shared.td}>{s.endDate || "—"}</td></tr>
      </tbody></table>
      <h3 style={{ marginTop: "28px" }}>Assigned Sites ({s.sites.length})</h3>
      {s.sites.length === 0 ? <p>No sites assigned.</p> : (
        <table style={shared.table}><thead><tr><th style={shared.th}>Name</th><th style={shared.th}>City</th><th style={shared.th}>Country</th><th style={shared.th}>Status</th><th style={shared.th}>Assignment</th>{isAdmin && <th style={shared.th}></th>}</tr></thead>
          <tbody>{s.sites.map((si) => {
            const removed = si.assignmentStatus === "Removed";
            return (
              <tr key={si.id} style={{ opacity: removed ? 0.5 : 1 }}>
                <td style={{ ...shared.td, cursor: "pointer", color: colors.primary, fontWeight: 500 }} onClick={() => setPanel({ open: true, type: "site", id: si.id })}>{si.name}</td><td style={shared.td}>{si.city}</td><td style={shared.td}>{si.country}</td>
                <td style={shared.td}><span style={{ ...shared.badge, backgroundColor: statusColor(si.status) }}>{si.status}</span></td>
                <td style={shared.td}><span style={{ ...shared.badge, backgroundColor: removed ? "#dc2626" : colors.success, color: "#fff" }}>{si.assignmentStatus}</span></td>
                {isAdmin && <td style={shared.td}>{!removed ? <button onClick={() => setConfirmSiteId(si.id)} style={unassignBtn}>Unassign</button> : <button onClick={async () => { await reassignSite({ variables: { studyId: id, siteId: si.id } }); refetch(); setToast("Site reassigned!"); }} style={reassignBtn}>Reassign</button>}</td>}
              </tr>);
          })}</tbody></table>
      )}
      <h3 style={{ marginTop: "28px" }}>Assigned Examiners ({s.examiners.length})</h3>
      {s.examiners.length === 0 ? <p>No examiners assigned.</p> : (
        <table style={shared.table}><thead><tr><th style={shared.th}>Name</th><th style={shared.th}>Role</th><th style={shared.th}>Site</th><th style={shared.th}>Assignment</th></tr></thead>
          <tbody>{s.examiners.map((e, i) => {
            const removed = e.assignmentStatus === "Removed";
            return (
              <tr key={`${e.id}-${i}`} style={{ opacity: removed ? 0.5 : 1 }}>
                <td style={{ ...shared.td, cursor: "pointer", color: colors.primary, fontWeight: 500 }} onClick={() => setPanel({ open: true, type: "examiner", id: e.id })}>{e.name}</td>
                <td style={shared.td}>{e.role}</td>
                <td style={shared.td}><span style={{ fontSize: "12px", color: colors.textLight }}>🏥</span> {e.siteName || "—"}</td>
                <td style={shared.td}><span style={{ ...shared.badge, backgroundColor: removed ? "#dc2626" : colors.success, color: "#fff" }}>{e.assignmentStatus}</span></td>
              </tr>);
          })}</tbody></table>
      )}
      {confirmSiteId && <ConfirmModal message="Unassign this site? Examiners linked via this site will also be removed from this study." onConfirm={async () => { await unassignSite({ variables: { studyId: id, siteId: confirmSiteId } }); setConfirmSiteId(null); refetch(); setToast("Site unassigned. Related examiners removed."); }} onCancel={() => setConfirmSiteId(null)} />}
      {showEdit && <EditStudyModal study={s} onClose={() => setShowEdit(false)} onSuccess={(m) => { setShowEdit(false); refetch(); setToast(m); }} />}
      {showHistory && <AuditHistory entity="study" entityId={id} entityName={s.name} onClose={() => setShowHistory(false)} />}
      <SidePanel open={panel.open} onClose={() => setPanel({ open: false, type: null, id: null })} entityType={panel.type} entityId={panel.id} />
    </div>
  );
}

function EditStudyModal({ study, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: study.name, sponsor: study.sponsor || "", phase: study.phase || "Phase I", startDate: study.startDate || "", endDate: study.endDate || "", status: study.status || "Planned" });
  const [updateStudy, { loading }] = useMutation(UPDATE_STUDY);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const handleSubmit = async (e) => { e.preventDefault(); await updateStudy({ variables: { id: study.id, ...form } }); onSuccess(`Study "${form.name}" updated!`); };
  return (
    <div style={overlay}><form onSubmit={handleSubmit} style={modal}>
      <h3 style={{ margin: "0 0 16px" }}>Edit Study</h3>
      <label style={lbl}>Study Name</label><input value={form.name} onChange={set("name")} required style={inp} />
      <label style={lbl}>Sponsor</label><input value={form.sponsor} onChange={set("sponsor")} style={inp} />
      <label style={lbl}>Phase</label><select value={form.phase} onChange={set("phase")} style={inp}><option>Phase I</option><option>Phase II</option><option>Phase III</option><option>Phase IV</option></select>
      <label style={lbl}>Start Date</label><input type="date" value={form.startDate} onChange={set("startDate")} style={inp} />
      <label style={lbl}>End Date</label><input type="date" value={form.endDate} onChange={set("endDate")} style={inp} />
      <label style={lbl}>Status</label><select value={form.status} onChange={set("status")} style={inp}><option>Planned</option><option>Active</option><option>Completed</option></select>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}><button type="button" onClick={onClose} style={cancelBtn}>Cancel</button><button type="submit" disabled={loading} style={btnStyle}>{loading ? "Saving..." : "Save"}</button></div>
    </form></div>
  );
}

function CreateStudyModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: "", sponsor: "", phase: "Phase I", startDate: "", endDate: "" });
  const [createStudy, { loading }] = useMutation(CREATE_STUDY);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const handleSubmit = async (e) => { e.preventDefault(); const { data } = await createStudy({ variables: form }); onSuccess(`Study "${data.createStudy.name}" created! Protocol ID: ${data.createStudy.protocolId}`); };
  return (
    <div style={overlay}><form onSubmit={handleSubmit} style={modal}>
      <h3 style={{ margin: "0 0 16px" }}>Create Study</h3>
      <label style={lbl}>Study Name *</label><input value={form.name} onChange={set("name")} required style={inp} />
      <label style={lbl}>Sponsor</label><input value={form.sponsor} onChange={set("sponsor")} style={inp} />
      <label style={lbl}>Phase</label><select value={form.phase} onChange={set("phase")} style={inp}><option>Phase I</option><option>Phase II</option><option>Phase III</option><option>Phase IV</option></select>
      <label style={lbl}>Start Date</label><input type="date" value={form.startDate} onChange={set("startDate")} style={inp} />
      <label style={lbl}>End Date</label><input type="date" value={form.endDate} onChange={set("endDate")} style={inp} />
      <p style={{ fontSize: "12px", color: colors.textLight, margin: "0 0 4px" }}>Protocol ID will be auto-generated</p>
      <p style={{ fontSize: "12px", color: colors.warning, margin: "0 0 12px" }}>Status will be set to Planned initially</p>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}><button type="button" onClick={onClose} style={cancelBtn}>Cancel</button><button type="submit" disabled={loading} style={btnStyle}>{loading ? "Creating..." : "Create"}</button></div>
    </form></div>
  );
}

const tdL = { ...shared.td, fontWeight: 600 };
const btnStyle = { padding: "9px 20px", background: colors.gradient, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" };
const editBtn = { padding: "8px 16px", background: colors.warningLight, color: "#b45309", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "13px" };
const historyBtn = { padding: "8px 16px", background: colors.accentLight, color: colors.accent, border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "13px" };
const unassignBtn = { padding: "4px 10px", background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };
const reassignBtn = { padding: "4px 10px", background: colors.successLight, color: colors.success, border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };
const cancelBtn = { padding: "9px 20px", background: "#fff", color: colors.text, border: `1px solid ${colors.border}`, borderRadius: "8px", cursor: "pointer", fontSize: "14px" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 };
const modal = { background: "#fff", borderRadius: "16px", padding: "28px", width: "420px", maxHeight: "90vh", overflow: "auto" };
const lbl = { fontSize: "13px", fontWeight: 600, color: colors.text, marginBottom: "4px", display: "block" };
const inp = { width: "100%", padding: "10px 14px", fontSize: "14px", border: `1px solid ${colors.border}`, borderRadius: "8px", marginBottom: "12px", boxSizing: "border-box", outline: "none" };
const filterCard = { background: colors.card, borderRadius: "10px", padding: "10px 14px", border: `1px solid ${colors.border}`, marginTop: "12px", marginBottom: "4px" };
const filterRow = { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" };
const selectStyle = { padding: "7px 10px", fontSize: "13px", border: `1px solid ${colors.border}`, borderRadius: "8px", outline: "none", background: "#fff", color: colors.text, cursor: "pointer", fontFamily: "'Inter', sans-serif" };
const clearFilterBtn = { padding: "7px 12px", fontSize: "12px", border: "none", borderRadius: "8px", background: "#fef2f2", color: "#ef4444", cursor: "pointer", fontWeight: 500 };
const resultCount = { fontSize: "12px", color: colors.textLight, fontWeight: 500 };
const searchBarStyle = { position: "relative" };
const searchInputStyle = { width: "100%", padding: "7px 32px 7px 12px", fontSize: "13px", border: `1px solid ${colors.border}`, borderRadius: "8px", outline: "none", boxSizing: "border-box", fontFamily: "'Inter', sans-serif", background: "#fff" };
const searchClearStyle = { position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: "14px", cursor: "pointer", color: colors.textLight };
