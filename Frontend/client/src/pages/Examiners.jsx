import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useLocation, useNavigate } from "react-router-dom";
import { GET_EXAMINERS, GET_EXAMINER, GET_SITES, GET_STUDIES, CREATE_EXAMINER, ASSIGN_EXAMINER_TO_SITE, UPDATE_EXAMINER, ADD_CERTIFICATE, UPDATE_CERTIFICATE } from "../graphql";
import { shared, statusColor, colors } from "../styles";
import Pagination from "../components/Pagination";
import Toast from "../components/Toast";
import SidePanel from "../components/SidePanel";
import AuditHistory from "../components/AuditHistory";

export default function Examiners({ isAdmin }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showCert, setShowCert] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (location.state?.selectedId) {
      setSelectedId(location.state.selectedId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  if (selectedId) return <ExaminerDetail id={selectedId} onBack={() => setSelectedId(null)} isAdmin={isAdmin} setToast={setToast} />;
  return (
    <>
      <ExaminerList page={page} setPage={setPage} onSelect={setSelectedId} isAdmin={isAdmin} onCreate={() => setShowCreate(true)} onAssign={() => setShowAssign(true)} onCert={() => setShowCert(true)} />
      {showCreate && <CreateExaminerModal onClose={() => setShowCreate(false)} onSuccess={(m) => { setShowCreate(false); setToast(m); }} />}
      {showAssign && <AssignExaminerModal onClose={() => setShowAssign(false)} onSuccess={(m) => { setShowAssign(false); setToast(m); }} />}
      {showCert && <AddCertificateModal onClose={() => setShowCert(false)} onSuccess={(m) => { setShowCert(false); setToast(m); }} />}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </>
  );
}

function ExaminerList({ page, setPage, onSelect, isAdmin, onCreate, onAssign, onCert }) {
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setSearchDebounced(search), 300); return () => clearTimeout(t); }, [search]);
  const vars = { page, limit: 10, search: searchDebounced || null };
  const { data, loading, error } = useQuery(GET_EXAMINERS, { variables: vars, fetchPolicy: "cache-and-network" });
  if (loading && !data) return <p style={shared.page}>Loading...</p>;
  if (error) return <p style={shared.page}>Error: {error.message}</p>;
  const items = data?.examiners?.data || [];
  const totalPages = data?.examiners?.totalPages || 1;
  return (
    <div style={shared.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2>Examiners</h2>
        {isAdmin && <div style={{ display: "flex", gap: "8px" }}><button onClick={onCreate} style={btnStyle}>＋ Create Examiner</button><button onClick={onAssign} style={assignBtn}>🔗 Assign Examiner</button><button onClick={onCert} style={certBtnStyle}>📄 Add Certificate</button></div>}
      </div>
      <div style={searchBarStyle}>
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search examiners by name or role..." style={searchInputStyle} />
        {search && <button onClick={() => { setSearch(""); setPage(1); }} style={searchClearStyle}>✕</button>}
      </div>
      <div style={shared.cardGrid}>{items.map((e) => (
        <div key={e.id} style={shared.card} onClick={() => onSelect(e.id)} onMouseEnter={(ev) => (ev.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")} onMouseLeave={(ev) => (ev.currentTarget.style.boxShadow = "none")}>
          <h3 style={shared.cardTitle}>{e.name}</h3>
          <span style={{ ...shared.badge, backgroundColor: e.role === "Principal Investigator" ? colors.primary : colors.textLight }}>{e.role}</span>
        </div>))}</div>
      {items.length === 0 && search && <p style={{ textAlign: "center", color: colors.textLight, marginTop: "24px" }}>No examiners match "{search}"</p>}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function ExaminerDetail({ id, onBack, isAdmin, setToast }) {
  const { data, loading, error, refetch } = useQuery(GET_EXAMINER, { variables: { id } });
  const [showEdit, setShowEdit] = useState(false);
  const [panel, setPanel] = useState({ open: false, type: null, id: null });
  const [showHistory, setShowHistory] = useState(false);
  if (loading) return <p style={shared.page}>Loading...</p>;
  if (error) return <p style={shared.page}>Error: {error.message}</p>;
  const e = data.examiner;
  return (
    <div style={shared.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={shared.backBtn}>← Back to Examiners</button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setShowHistory(true)} style={historyBtn}>📜 History</button>
          {isAdmin && <button onClick={() => setShowEdit(true)} style={editBtn}>✏️ Edit</button>}
        </div>
      </div>
      <h2>{e.name}</h2><span style={{ ...shared.badge, backgroundColor: e.role === "Principal Investigator" ? colors.primary : colors.textLight }}>{e.role}</span>
      <h3 style={{ marginTop: "28px" }}>Assigned Sites ({e.sites.length})</h3>
      {e.sites.length === 0 ? <p>No sites assigned.</p> : (
        <table style={shared.table}><thead><tr><th style={shared.th}>Name</th><th style={shared.th}>City</th><th style={shared.th}>Country</th><th style={shared.th}>Status</th></tr></thead>
          <tbody>{e.sites.map((si) => (<tr key={si.id}><td style={{ ...shared.td, cursor: "pointer", color: colors.primary, fontWeight: 500 }} onClick={() => setPanel({ open: true, type: "site", id: si.id })}>{si.name}</td><td style={shared.td}>{si.city}</td><td style={shared.td}>{si.country}</td><td style={shared.td}><span style={{ ...shared.badge, backgroundColor: statusColor(si.status) }}>{si.status}</span></td></tr>))}</tbody></table>
      )}
      <h3 style={{ marginTop: "28px" }}>Assigned Studies ({e.studies.length})</h3>
      {e.studies.length === 0 ? <p>No studies assigned.</p> : (
        <table style={shared.table}><thead><tr><th style={shared.th}>Name</th><th style={shared.th}>Sponsor</th><th style={shared.th}>Phase</th><th style={shared.th}>Site</th><th style={shared.th}>Status</th></tr></thead>
          <tbody>{e.studies.map((st, i) => (<tr key={`${st.id}-${i}`}><td style={{ ...shared.td, cursor: "pointer", color: colors.primary, fontWeight: 500 }} onClick={() => setPanel({ open: true, type: "study", id: st.id })}>{st.name}</td><td style={shared.td}>{st.sponsor}</td><td style={shared.td}>{st.phase}</td><td style={shared.td}><span style={{ fontSize: "12px", color: colors.textLight }}>🏥</span> {st.siteName || "—"}</td><td style={shared.td}><span style={{ ...shared.badge, backgroundColor: statusColor(st.status) }}>{st.status}</span></td></tr>))}</tbody></table>
      )}
      <h3 style={{ marginTop: "28px" }}>Certificates ({e.certificates.length})</h3>
      {e.certificates.length === 0 ? <p>No certificates.</p> : (
        <table style={shared.table}><thead><tr><th style={shared.th}>Study</th><th style={shared.th}>Expiry Date</th><th style={shared.th}>Status</th></tr></thead>
          <tbody>{e.certificates.map((c) => (
            <tr key={c.id}>
              <td style={shared.td}>{c.studyName}</td>
              <td style={shared.td}>{c.expiryDate}</td>
              <td style={shared.td}><CertStatusBadge status={c.status} daysLeft={c.daysLeft} /></td>
            </tr>
          ))}</tbody></table>
      )}
      {showEdit && <EditExaminerModal examiner={e} onClose={() => setShowEdit(false)} onSuccess={(m) => { setShowEdit(false); refetch(); setToast(m); }} />}
      {showHistory && <AuditHistory entity="examiner" entityId={id} entityName={e.name} onClose={() => setShowHistory(false)} />}
      <SidePanel open={panel.open} onClose={() => setPanel({ open: false, type: null, id: null })} entityType={panel.type} entityId={panel.id} />
    </div>
  );
}

function CertStatusBadge({ status, daysLeft }) {
  let bg = colors.success, color = "#fff";
  if (status === "Expired") { bg = "#dc2626"; }
  else if (status === "Expiring Soon") { bg = colors.warning; }
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, backgroundColor: bg, color }}>{status}{status !== "Expired" && daysLeft > 0 ? ` (${daysLeft}d)` : ""}</span>;
}

function EditExaminerModal({ examiner, onClose, onSuccess }) {
  const [tab, setTab] = useState("details");
  const [form, setForm] = useState({ name: examiner.name, role: examiner.role || "Principal Investigator" });
  const [updateExaminer, { loading }] = useMutation(UPDATE_EXAMINER);
  const [updateCert, { loading: certLoading }] = useMutation(UPDATE_CERTIFICATE);
  const [certDates, setCertDates] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const handleSubmit = async (e) => { e.preventDefault(); await updateExaminer({ variables: { id: examiner.id, ...form } }); onSuccess(`Examiner "${form.name}" updated!`); };
  const handleCertRenew = async (cert) => {
    const newDate = certDates[cert.id];
    if (!newDate) return;
    await updateCert({ variables: { id: cert.id, expiryDate: newDate } });
    onSuccess(`Certificate for "${cert.studyName}" renewed!`);
  };
  const certs = examiner.certificates || [];
  return (<div style={overlay}><div style={modal}>
    <h3 style={{ margin: "0 0 12px" }}>Edit Examiner</h3>
    <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: `2px solid ${colors.border}` }}>
      <button onClick={() => setTab("details")} style={{ ...tabBtnStyle, ...(tab === "details" ? tabActiveStyle : {}) }}>Details</button>
      <button onClick={() => setTab("certs")} style={{ ...tabBtnStyle, ...(tab === "certs" ? tabActiveStyle : {}) }}>📄 Certificates ({certs.length})</button>
    </div>
    {tab === "details" && (
      <form onSubmit={handleSubmit}>
        <label style={lbl}>Name</label><input value={form.name} onChange={set("name")} required style={inp} />
        <label style={lbl}>Role</label><select value={form.role} onChange={set("role")} style={inp}><option>Principal Investigator</option><option>Sub-Investigator</option></select>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}><button type="button" onClick={onClose} style={cancelBtn}>Cancel</button><button type="submit" disabled={loading} style={btnStyle}>{loading ? "Saving..." : "Save"}</button></div>
      </form>
    )}
    {tab === "certs" && (
      <div>
        {certs.length === 0 ? <p style={{ color: colors.textLight, fontSize: "13px" }}>No certificates. Use "Add Certificate" to create one.</p> :
          certs.map((c) => {
            let bg = colors.success;
            if (c.status === "Expired") bg = "#dc2626";
            else if (c.status === "Expiring Soon") bg = colors.warning;
            return (
              <div key={c.id} style={{ padding: "12px", border: `1px solid ${colors.border}`, borderRadius: "10px", marginBottom: "8px", opacity: c.status === "Expired" ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px", color: colors.text }}>{c.studyName}</span>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, backgroundColor: bg, color: "#fff" }}>{c.status}{c.daysLeft > 0 ? ` (${c.daysLeft}d)` : ""}</span>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="date" defaultValue={c.expiryDate} onChange={(e) => setCertDates(p => ({ ...p, [c.id]: e.target.value }))} style={{ ...inp, marginBottom: 0, flex: 1 }} />
                  <button type="button" onClick={() => handleCertRenew(c)} disabled={certLoading || !certDates[c.id]} style={{ ...btnStyle, padding: "8px 14px", fontSize: "12px", opacity: certDates[c.id] ? 1 : 0.5 }}>Renew</button>
                </div>
              </div>
            );
          })
        }
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}><button type="button" onClick={onClose} style={cancelBtn}>Close</button></div>
      </div>
    )}
  </div></div>);
}

function CreateExaminerModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: "", role: "Principal Investigator" });
  const [createExaminer, { loading }] = useMutation(CREATE_EXAMINER);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const handleSubmit = async (e) => { e.preventDefault(); const { data } = await createExaminer({ variables: form }); onSuccess(`Examiner "${data.createExaminer.name}" created!`); };
  return (<div style={overlay}><form onSubmit={handleSubmit} style={modal}><h3 style={{ margin: "0 0 16px" }}>Create Examiner</h3><label style={lbl}>Name *</label><input value={form.name} onChange={set("name")} required style={inp} /><label style={lbl}>Role</label><select value={form.role} onChange={set("role")} style={inp}><option>Principal Investigator</option><option>Sub-Investigator</option></select><div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}><button type="button" onClick={onClose} style={cancelBtn}>Cancel</button><button type="submit" disabled={loading} style={btnStyle}>{loading ? "Creating..." : "Create"}</button></div></form></div>);
}

function AssignExaminerModal({ onClose, onSuccess }) {
  const { data: examinerData } = useQuery(GET_EXAMINERS, { variables: { limit: 1000 } });
  const { data: siteData } = useQuery(GET_SITES, { variables: { limit: 1000 } });
  const [examinerId, setExaminerId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [assign, { loading }] = useMutation(ASSIGN_EXAMINER_TO_SITE);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (examinerId && siteId) {
      await assign({ variables: { examinerId, siteId } });
      const n = (examinerData?.examiners?.data || []).find((e) => e.id === examinerId)?.name;
      const sName = (siteData?.sites?.data || []).find((s) => s.id === siteId)?.name;
      onSuccess(`"${n}" assigned to "${sName}" successfully!`);
    }
  };
  return (
    <div style={overlay}><form onSubmit={handleSubmit} style={modal}>
      <h3 style={{ margin: "0 0 16px" }}>Assign Examiner to Site</h3>
      <label style={lbl}>Select Examiner *</label>
      <select value={examinerId} onChange={(e) => setExaminerId(e.target.value)} required style={inp}>
        <option value="">-- Select --</option>
        {(examinerData?.examiners?.data || []).map((e) => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
      </select>
      <label style={lbl}>Select Site *</label>
      <select value={siteId} onChange={(e) => setSiteId(e.target.value)} required style={inp}>
        <option value="">-- Select --</option>
        {(siteData?.sites?.data || []).filter((s) => s.status !== "Closed").map((s) => <option key={s.id} value={s.id}>{s.name} — {s.city}, {s.country} ({s.status})</option>)}
      </select>
      <p style={{ fontSize: "12px", color: colors.textLight, margin: "0 0 12px" }}>ℹ️ To assign an examiner to a study, use "Assign Site to Study" in the Sites page. The examiner must have a valid certificate for that study.</p>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
        <button type="submit" disabled={loading || !examinerId || !siteId} style={btnStyle}>{loading ? "Assigning..." : "Assign"}</button>
      </div>
    </form></div>
  );
}

function AddCertificateModal({ onClose, onSuccess }) {
  const { data: examinerData } = useQuery(GET_EXAMINERS, { variables: { limit: 1000 } });
  const { data: studyData } = useQuery(GET_STUDIES, { variables: { limit: 1000 } });
  const [examinerId, setExaminerId] = useState("");
  const [selected, setSelected] = useState([]);
  const [addCert, { loading }] = useMutation(ADD_CERTIFICATE);
  const toggleStudy = (id) => setSelected(p => p.find(s => s.id === id) ? p.filter(s => s.id !== id) : [...p, { id, expiry: "" }]);
  const setExpiry = (id, date) => setSelected(p => p.map(s => s.id === id ? { ...s, expiry: date } : s));
  const allValid = examinerId && selected.length > 0 && selected.every(s => s.expiry);
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    for (const s of selected) {
      await addCert({ variables: { examinerId, studyId: s.id, expiryDate: s.expiry } });
    }
    const name = (examinerData?.examiners?.data || []).find(e => e.id === examinerId)?.name;
    onSuccess(`${selected.length} certificate(s) added for "${name}"!`);
  };
  return (
    <div style={overlay}><form onSubmit={handleSubmit} style={modal}>
      <h3 style={{ margin: "0 0 16px" }}>📄 Add Certificate</h3>
      <label style={lbl}>Select Examiner *</label>
      <select value={examinerId} onChange={(ev) => { setExaminerId(ev.target.value); setSelected([]); }} required style={inp}>
        <option value="">-- Select --</option>
        {(examinerData?.examiners?.data || []).map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
      </select>
      {examinerId && (<>
        <label style={lbl}>Select Studies & Expiry Dates *</label>
        <div style={checkList}>
          {(studyData?.studies?.data || []).filter(s => s.status !== "Completed").map(st => {
            const sel = selected.find(s => s.id === st.id);
            return (
              <div key={st.id} style={{ padding: "6px 4px" }}>
                <label style={checkItem}>
                  <input type="checkbox" checked={!!sel} onChange={() => toggleStudy(st.id)} />
                  {st.name} <span style={{ fontSize: "12px", color: colors.textLight }}>({st.phase})</span>
                </label>
                {sel && <input type="date" value={sel.expiry} onChange={(ev) => setExpiry(st.id, ev.target.value)} required style={{ ...inp, marginTop: "4px", marginBottom: "4px", marginLeft: "24px", width: "calc(100% - 24px)" }} />}
              </div>
            );
          })}
        </div>
      </>)}
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
        <button type="submit" disabled={loading || !allValid} style={btnStyle}>{loading ? "Adding..." : "Add Certificate"}</button>
      </div>
    </form></div>
  );
}

const btnStyle = { padding: "9px 20px", background: colors.gradient, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" };
const assignBtn = { padding: "9px 20px", background: "#fff", color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" };
const certBtnStyle = { padding: "9px 20px", background: colors.warningLight, color: "#b45309", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" };
const tabBtnStyle = { background: "none", border: "none", padding: "8px 14px", cursor: "pointer", fontSize: "13px", fontWeight: 500, color: colors.textLight, borderBottom: "2px solid transparent", marginBottom: "-2px" };
const tabActiveStyle = { color: colors.primary, fontWeight: 600, borderBottomColor: colors.primary };
const editBtn = { padding: "8px 16px", background: colors.warningLight, color: "#b45309", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "13px" };
const historyBtn = { padding: "8px 16px", background: colors.accentLight, color: colors.accent, border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "13px" };
const cancelBtn = { padding: "9px 20px", background: "#fff", color: colors.text, border: `1px solid ${colors.border}`, borderRadius: "8px", cursor: "pointer", fontSize: "14px" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 };
const modal = { background: "#fff", borderRadius: "16px", padding: "28px", width: "460px", maxHeight: "90vh", overflow: "auto" };
const lbl = { fontSize: "13px", fontWeight: 600, color: colors.text, marginBottom: "4px", display: "block" };
const inp = { width: "100%", padding: "10px 14px", fontSize: "14px", border: `1px solid ${colors.border}`, borderRadius: "8px", marginBottom: "12px", boxSizing: "border-box", outline: "none" };
const searchBarStyle = { position: "relative", marginTop: "14px", marginBottom: "4px" };
const searchInputStyle = { width: "100%", padding: "11px 40px 11px 16px", fontSize: "14px", border: `1px solid ${colors.border}`, borderRadius: "10px", outline: "none", boxSizing: "border-box", fontFamily: "'Inter', sans-serif", background: colors.card };
const searchClearStyle = { position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: "16px", cursor: "pointer", color: colors.textLight };
const checkList = { maxHeight: "200px", overflow: "auto", border: `1px solid ${colors.border}`, borderRadius: "8px", padding: "8px", marginBottom: "12px" };
const checkItem = { display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", cursor: "pointer", fontSize: "14px" };
