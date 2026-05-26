import { useState, useEffect } from "react";
import { useQuery, useMutation, useLazyQuery, useApolloClient } from "@apollo/client";
import { useLocation, useNavigate } from "react-router-dom";
import { GET_SITES, GET_SITE, GET_STUDIES, CREATE_SITE, ASSIGN_SITES_TO_STUDY, UPDATE_SITE, UNASSIGN_EXAMINER_FROM_SITE, REASSIGN_EXAMINER_TO_SITE, CERTIFIED_EXAMINERS } from "../graphql";
import { shared, statusColor, colors } from "../styles";
import Pagination from "../components/Pagination";
import Toast from "../components/Toast";
import SidePanel from "../components/SidePanel";
import AuditHistory from "../components/AuditHistory";

export default function Sites({ isAdmin }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (location.state?.selectedId) {
      setSelectedId(location.state.selectedId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  if (selectedId) return <SiteDetail id={selectedId} onBack={() => setSelectedId(null)} isAdmin={isAdmin} setToast={setToast} />;
  return (
    <>
      <SiteList page={page} setPage={setPage} onSelect={setSelectedId} isAdmin={isAdmin} onCreate={() => setShowCreate(true)} onAssign={() => setShowAssign(true)} />
      {showCreate && <CreateSiteModal onClose={() => setShowCreate(false)} onSuccess={(m) => { setShowCreate(false); setToast(m); }} />}
      {showAssign && <AssignSiteModal onClose={() => setShowAssign(false)} onSuccess={(m) => { setShowAssign(false); setToast(m); }} />}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

function SiteList({ page, setPage, onSelect, isAdmin, onCreate, onAssign }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setSearchDebounced(search), 300); return () => clearTimeout(t); }, [search]);
  const vars = { page, limit: 10, search: searchDebounced || null, status: status || null };
  const { data, loading, error } = useQuery(GET_SITES, { variables: vars, fetchPolicy: "cache-and-network" });
  if (loading && !data) return <p style={shared.page}>Loading...</p>;
  if (error) return <p style={shared.page}>Error: {error.message}</p>;
  const items = data?.sites?.data || [];
  const totalPages = data?.sites?.totalPages || 1;
  const totalCount = data?.sites?.totalCount || 0;
  const hasFilters = search || status;
  const clearAll = () => { setSearch(""); setStatus(""); setPage(1); };
  return (
    <div style={shared.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2>Sites</h2>
        {isAdmin && <div style={{ display: "flex", gap: "8px" }}><button onClick={onCreate} style={btnStyle}>＋ Create Site</button><button onClick={onAssign} style={assignBtn}>🔗 Assign Site to Study</button></div>}
      </div>
      <div style={filterCard}>
        <div style={filterRow}>
          <div style={{ ...searchBarStyle, flex: 1 }}>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, city, country..." style={searchInputStyle} />
            {search && <button onClick={() => { setSearch(""); setPage(1); }} style={searchClearStyle}>✕</button>}
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={selectStyle}>
            <option value="">All Statuses</option>
            <option>Planned</option><option>Active</option><option>Closed</option>
          </select>
          {hasFilters && <button onClick={clearAll} style={clearFilterBtn}>✕ Clear</button>}
          {hasFilters && <span style={resultCount}>{totalCount} found</span>}
        </div>
      </div>
      <div style={shared.cardGrid}>{items.map((s) => (
        <div key={s.id} style={shared.card} onClick={() => onSelect(s.id)} onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
          <h3 style={shared.cardTitle}>{s.name}</h3><p style={shared.cardSub}>📍 {s.city}, {s.country}</p>
          <span style={{ ...shared.badge, backgroundColor: statusColor(s.status) }}>{s.status}</span>
        </div>))}</div>
      {items.length === 0 && hasFilters && <p style={{ textAlign: "center", color: colors.textLight, marginTop: "24px" }}>No sites match your filters</p>}
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

function SiteDetail({ id, onBack, isAdmin, setToast }) {
  const { data, loading, error, refetch } = useQuery(GET_SITE, { variables: { id } });
  const [showEdit, setShowEdit] = useState(false);
  const [unassignExaminer] = useMutation(UNASSIGN_EXAMINER_FROM_SITE);
  const [reassignExaminer] = useMutation(REASSIGN_EXAMINER_TO_SITE);
  const [panel, setPanel] = useState({ open: false, type: null, id: null });
  const [showHistory, setShowHistory] = useState(false);
  const [confirmExaminerId, setConfirmExaminerId] = useState(null);
  if (loading) return <p style={shared.page}>Loading...</p>;
  if (error) return <p style={shared.page}>Error: {error.message}</p>;
  const s = data.site;
  return (
    <div style={shared.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={shared.backBtn}>← Back to Sites</button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setShowHistory(true)} style={historyBtn}>📜 History</button>
          {isAdmin && <button onClick={() => setShowEdit(true)} style={editBtn}>✏️ Edit</button>}
        </div>
      </div>
      <h2>{s.name}</h2><span style={{ ...shared.badge, backgroundColor: statusColor(s.status) }}>{s.status}</span>
      <table style={{ ...shared.table, marginTop: "20px" }}><tbody>
        <tr><td style={tdL}>City</td><td style={shared.td}>{s.city || "—"}</td></tr>
        <tr><td style={tdL}>Country</td><td style={shared.td}>{s.country || "—"}</td></tr>
      </tbody></table>
      <h3 style={{ marginTop: "28px" }}>Assigned Studies ({s.studies.length})</h3>
      {s.studies.length === 0 ? <p>No studies assigned.</p> : (
        <table style={shared.table}><thead><tr><th style={shared.th}>Name</th><th style={shared.th}>Sponsor</th><th style={shared.th}>Phase</th><th style={shared.th}>Status</th><th style={shared.th}>Assignment</th></tr></thead>
          <tbody>{s.studies.map((st) => {
            const removed = st.assignmentStatus === "Removed";
            return (
              <tr key={st.id} style={{ opacity: removed ? 0.5 : 1 }}>
                <td style={{ ...shared.td, cursor: "pointer", color: colors.primary, fontWeight: 500 }} onClick={() => setPanel({ open: true, type: "study", id: st.id })}>{st.name}</td>
                <td style={shared.td}>{st.sponsor}</td><td style={shared.td}>{st.phase}</td>
                <td style={shared.td}><span style={{ ...shared.badge, backgroundColor: statusColor(st.status) }}>{st.status}</span></td>
                <td style={shared.td}><span style={{ ...shared.badge, backgroundColor: removed ? "#dc2626" : colors.success, color: "#fff" }}>{st.assignmentStatus}</span></td>
              </tr>);
          })}</tbody></table>
      )}
      <h3 style={{ marginTop: "28px" }}>Assigned Examiners ({s.examiners.length})</h3>
      {s.examiners.length === 0 ? <p>No examiners assigned.</p> : (
        <table style={shared.table}><thead><tr><th style={shared.th}>Name</th><th style={shared.th}>Role</th><th style={shared.th}>Studies</th><th style={shared.th}>Assignment</th>{isAdmin && <th style={shared.th}></th>}</tr></thead>
          <tbody>{s.examiners.map((e) => {
            const removed = e.assignmentStatus === "Removed";
            return (
              <tr key={e.id} style={{ opacity: removed ? 0.5 : 1 }}>
                <td style={{ ...shared.td, cursor: "pointer", color: colors.primary, fontWeight: 500 }} onClick={() => setPanel({ open: true, type: "examiner", id: e.id })}>{e.name}</td><td style={shared.td}>{e.role}</td>
                <td style={shared.td}>{e.studyNames && e.studyNames.length > 0 ? e.studyNames.map((n, i) => <span key={i} style={{ display: "inline-block", fontSize: "11px", background: colors.primaryLight, color: colors.primaryDark, padding: "2px 8px", borderRadius: "10px", marginRight: "4px", marginBottom: "2px" }}>{n}</span>) : <span style={{ color: colors.textLight, fontSize: "12px" }}>—</span>}</td>
                <td style={shared.td}><span style={{ ...shared.badge, backgroundColor: removed ? "#dc2626" : colors.success, color: "#fff" }}>{e.assignmentStatus}</span></td>
                {isAdmin && <td style={shared.td}>{!removed ? <button onClick={() => setConfirmExaminerId(e.id)} style={unassignBtn}>Unassign</button> : <button onClick={async () => { await reassignExaminer({ variables: { siteId: id, examinerId: e.id } }); refetch(); setToast("Examiner reassigned!"); }} style={reassignBtn}>Reassign</button>}</td>}
              </tr>);
          })}</tbody></table>
      )}
      {confirmExaminerId && <ConfirmModal message="Unassign this examiner? If no examiners remain, the site will become Planned and all studies will be unassigned." onConfirm={async () => { await unassignExaminer({ variables: { siteId: id, examinerId: confirmExaminerId } }); setConfirmExaminerId(null); refetch(); setToast("Examiner unassigned."); }} onCancel={() => setConfirmExaminerId(null)} />}
      {showEdit && <EditSiteModal site={s} onClose={() => setShowEdit(false)} onSuccess={(m) => { setShowEdit(false); refetch(); setToast(m); }} />}
      {showHistory && <AuditHistory entity="site" entityId={id} entityName={s.name} onClose={() => setShowHistory(false)} />}
      <SidePanel open={panel.open} onClose={() => setPanel({ open: false, type: null, id: null })} entityType={panel.type} entityId={panel.id} />
    </div>
  );
}

function EditSiteModal({ site, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: site.name, city: site.city || "", country: site.country || "", status: site.status || "Planned" });
  const [updateSite, { loading }] = useMutation(UPDATE_SITE);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const handleSubmit = async (e) => { e.preventDefault(); await updateSite({ variables: { id: site.id, ...form } }); onSuccess(`Site "${form.name}" updated!`); };
  return (<div style={overlay}><form onSubmit={handleSubmit} style={modal}><h3 style={{ margin: "0 0 16px" }}>Edit Site</h3><label style={lbl}>Site Name</label><input value={form.name} onChange={set("name")} required style={inp} /><label style={lbl}>City</label><input value={form.city} onChange={set("city")} style={inp} /><label style={lbl}>Country</label><input value={form.country} onChange={set("country")} style={inp} /><label style={lbl}>Status</label><select value={form.status} onChange={set("status")} style={inp}><option>Planned</option><option>Active</option><option>Closed</option></select><div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}><button type="button" onClick={onClose} style={cancelBtn}>Cancel</button><button type="submit" disabled={loading} style={btnStyle}>{loading ? "Saving..." : "Save"}</button></div></form></div>);
}

function CreateSiteModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: "", city: "", country: "" });
  const [createSite, { loading }] = useMutation(CREATE_SITE);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const handleSubmit = async (e) => { e.preventDefault(); const { data } = await createSite({ variables: form }); onSuccess(`Site "${data.createSite.name}" created as Planned!`); };
  return (<div style={overlay}><form onSubmit={handleSubmit} style={modal}><h3 style={{ margin: "0 0 16px" }}>Create Site</h3><label style={lbl}>Site Name *</label><input value={form.name} onChange={set("name")} required style={inp} /><label style={lbl}>City</label><input value={form.city} onChange={set("city")} style={inp} /><label style={lbl}>Country</label><input value={form.country} onChange={set("country")} style={inp} /><p style={{ fontSize: "12px", color: colors.warning, margin: "0 0 12px" }}>⚠️ Site will be created as Planned. It will become Active after assigning an examiner.</p><div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}><button type="button" onClick={onClose} style={cancelBtn}>Cancel</button><button type="submit" disabled={loading} style={btnStyle}>{loading ? "Creating..." : "Create"}</button></div></form></div>);
}

function AssignSiteModal({ onClose, onSuccess }) {
  const { data: studyData } = useQuery(GET_STUDIES, { variables: { limit: 1000 } });
  const { data: siteData } = useQuery(GET_SITES, { variables: { limit: 1000 } });
  const [fetchCertified, { data: certData }] = useLazyQuery(CERTIFIED_EXAMINERS, { fetchPolicy: "network-only" });
  const [studyId, setStudyId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [selectedExaminers, setSelectedExaminers] = useState([]);
  const client = useApolloClient();
  const [assign, { loading }] = useMutation(ASSIGN_SITES_TO_STUDY);
  const handleStudyChange = (id) => { setStudyId(id); setSiteId(""); setSelectedExaminers([]); };
  const handleSiteChange = (id) => { setSiteId(id); setSelectedExaminers([]); if (id && studyId) fetchCertified({ variables: { siteId: id, studyId } }); };
  const toggleExaminer = (id) => setSelectedExaminers((p) => p.includes(id) ? p.filter((e) => e !== id) : [...p, id]);
  const certifiedExaminers = certData?.certifiedExaminersForStudy || [];
  const allStudies = studyData?.studies?.data || [];
  const allSites = siteData?.sites?.data || [];
  const activeSites = allSites.filter((s) => s.status === "Active");
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (studyId && siteId && selectedExaminers.length) {
      await assign({ variables: { studyId, siteIds: [siteId], examinerIds: selectedExaminers } });
      await client.resetStore();
      const n = allStudies.find((s) => s.id === studyId)?.name;
      const sn = allSites.find((s) => s.id === siteId)?.name;
      onSuccess(`Site "${sn}" with ${selectedExaminers.length} examiner(s) assigned to "${n}"!`);
    }
  };
  return (<div style={overlay}><form onSubmit={handleSubmit} style={modal}>
    <h3 style={{ margin: "0 0 16px" }}>Assign Site to Study</h3>
    <label style={lbl}>Select Study *</label>
    <select value={studyId} onChange={(e) => handleStudyChange(e.target.value)} required style={inp}>
      <option value="">-- Select --</option>
      {allStudies.filter((s) => s.status !== "Completed").map((s) => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
    </select>
    <label style={lbl}>Select Site * <span style={{ fontWeight: 400, color: colors.textLight }}>(only Active sites)</span></label>
    <select value={siteId} onChange={(e) => handleSiteChange(e.target.value)} required style={inp} disabled={!studyId}>
      <option value="">-- Select --</option>
      {activeSites.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.city}, {s.country}</option>)}
    </select>
    {studyId && activeSites.length === 0 && <p style={{ fontSize: "12px", color: colors.warning, margin: "0 0 12px" }}>⚠️ No active sites available.</p>}
    {siteId && studyId && certifiedExaminers.length > 0 && (<>
      <label style={lbl}>Select Examiners * <span style={{ fontWeight: 400, color: colors.textLight }}>(certified for this study)</span></label>
      <div style={checkList}>{certifiedExaminers.map((ex) => (
        <label key={ex.id} style={checkItem}>
          <input type="checkbox" checked={selectedExaminers.includes(ex.id)} onChange={() => toggleExaminer(ex.id)} />
          {ex.name} <span style={{ fontSize: "12px", color: colors.textLight }}>({ex.role})</span>
        </label>
      ))}</div>
    </>)}
    {siteId && studyId && certifiedExaminers.length === 0 && <p style={{ fontSize: "12px", color: colors.warning, margin: "0 0 12px" }}>⚠️ No examiners at this site have a valid certificate for this study. Add certificates first.</p>}
    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
      <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
      <button type="submit" disabled={loading || !studyId || !siteId || !selectedExaminers.length} style={btnStyle}>{loading ? "Assigning..." : "Assign"}</button>
    </div>
  </form></div>);
}

const tdL = { ...shared.td, fontWeight: 600 };
const btnStyle = { padding: "9px 20px", background: colors.gradient, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" };
const assignBtn = { padding: "9px 20px", background: "#fff", color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" };
const editBtn = { padding: "8px 16px", background: colors.warningLight, color: "#b45309", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "13px" };
const historyBtn = { padding: "8px 16px", background: colors.accentLight, color: colors.accent, border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "13px" };
const unassignBtn = { padding: "4px 10px", background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };
const reassignBtn = { padding: "4px 10px", background: colors.successLight, color: colors.success, border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };
const cancelBtn = { padding: "9px 20px", background: "#fff", color: colors.text, border: `1px solid ${colors.border}`, borderRadius: "8px", cursor: "pointer", fontSize: "14px" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 };
const modal = { background: "#fff", borderRadius: "16px", padding: "28px", width: "460px", maxHeight: "90vh", overflow: "auto" };
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
const checkList = { maxHeight: "200px", overflow: "auto", border: `1px solid ${colors.border}`, borderRadius: "8px", padding: "8px", marginBottom: "12px" };
const checkItem = { display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", cursor: "pointer", fontSize: "14px" };
