import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } from "./auth.js";

function mapStudy(r) {
  return { id: r.id, name: r.name, sponsor: r.sponsor, phase: r.phase, protocolId: r.protocol_id, startDate: r.start_date, endDate: r.end_date, status: r.status };
}
function mapSite(r) {
  return { id: r.id, name: r.name, city: r.city, country: r.country, status: r.status };
}
function mapExaminer(r) {
  return { id: r.id, name: r.name, role: r.role };
}

function mapCertificate(r) {
  const now = new Date();
  const expiry = new Date(r.expiry_date);
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  let status = "Active";
  if (daysLeft <= 0) status = "Expired";
  else if (daysLeft <= 30) status = "Expiring Soon";
  return { id: r.id, examinerId: r.examiner_id, studyId: r.study_id, studyName: r.study_name, expiryDate: r.expiry_date, status, daysLeft };
}

function generateProtocolId(db, studyName, sponsor) {
  const s1 = (studyName || "X").charAt(0).toUpperCase();
  const s2 = (sponsor || "X").charAt(0).toUpperCase();
  const prefix = s1 + s2;
  const totalStudies = db.prepare("SELECT COUNT(*) as c FROM studies").get().c;
  return `${prefix}-${String(totalStudies + 1).padStart(4, "0")}`;
}

function audit(db, action, entity, entityId, details) {
  db.prepare("INSERT INTO audit_logs (action, entity, entity_id, details) VALUES (?, ?, ?, ?)").run(action, entity, entityId, details);
}

function getName(db, table, id) {
  const r = db.prepare(`SELECT name FROM ${table} WHERE id = ?`).get(id);
  return r ? r.name : `#${id}`;
}

// Recompute study status based on active site count
function recomputeStudyStatus(db, studyId) {
  const activeSites = db.prepare("SELECT COUNT(*) as c FROM study_sites WHERE study_id = ? AND status = 'Active'").get(studyId).c;
  const study = db.prepare("SELECT status FROM studies WHERE id = ?").get(studyId);
  if (!study) return;
  if (activeSites > 0 && study.status === "Planned") {
    db.prepare("UPDATE studies SET status = 'Active' WHERE id = ?").run(studyId);
    audit(db, "STATUS", "study", studyId, `Status changed: Planned → Active (${activeSites} active site(s))`);
  } else if (activeSites === 0 && study.status === "Active") {
    db.prepare("UPDATE studies SET status = 'Planned' WHERE id = ?").run(studyId);
    audit(db, "STATUS", "study", studyId, `Status changed: Active → Planned (no active sites)`);
  }
}

// Recompute site status based on active examiner count, cascade to studies
function recomputeSiteStatus(db, siteId) {
  const activeExaminers = db.prepare("SELECT COUNT(*) as c FROM site_examiners WHERE site_id = ? AND status = 'Active'").get(siteId).c;
  const site = db.prepare("SELECT status, name FROM sites WHERE id = ?").get(siteId);
  if (!site) return;

  if (activeExaminers > 0 && site.status === "Planned") {
    db.prepare("UPDATE sites SET status = 'Active' WHERE id = ?").run(siteId);
    audit(db, "STATUS", "site", siteId, `Status changed: Planned → Active (${activeExaminers} active examiner(s))`);
  } else if (activeExaminers === 0 && site.status === "Active") {
    db.prepare("UPDATE sites SET status = 'Planned' WHERE id = ?").run(siteId);
    audit(db, "STATUS", "site", siteId, `Status changed: Active → Planned (no active examiners)`);

    // Cascade: unassign all studies from this now-Planned site
    const studyLinks = db.prepare("SELECT study_id FROM study_sites WHERE site_id = ? AND status = 'Active'").all(siteId);
    for (const { study_id } of studyLinks) {
      db.prepare("UPDATE study_sites SET status = 'Removed' WHERE study_id = ? AND site_id = ?").run(study_id, siteId);
      db.prepare("UPDATE study_site_examiners SET status = 'Removed' WHERE study_id = ? AND site_id = ?").run(study_id, siteId);
      const studyName = getName(db, "studies", study_id);
      audit(db, "UNASSIGN", "study", study_id, `Site auto-removed: ${site.name} (site became Planned)`);
      audit(db, "UNASSIGN", "site", siteId, `Auto-removed from study: ${studyName} (site became Planned)`);
      recomputeStudyStatus(db, study_id);
    }
  }
}

export const resolvers = {
  Query: {
    studies: (_, { page, limit, search, phase, status }, { db }) => {
      const pg = page || 1, lim = limit || 10;
      let sql = "SELECT * FROM studies WHERE 1=1";
      const params = [];
      if (search) { const q = `%${search}%`; sql += " AND (name LIKE ? OR sponsor LIKE ? OR protocol_id LIKE ?)"; params.push(q, q, q); }
      if (phase) { sql += " AND phase = ?"; params.push(phase); }
      if (status) { sql += " AND status = ?"; params.push(status); }
      const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as c");
      const totalCount = db.prepare(countSql).get(...params).c;
      const totalPages = Math.ceil(totalCount / lim);
      sql += " LIMIT ? OFFSET ?";
      params.push(lim, (pg - 1) * lim);
      const data = db.prepare(sql).all(...params).map(mapStudy);
      return { data, totalCount, totalPages };
    },
    study: (_, { id }, { db }) => { const r = db.prepare("SELECT * FROM studies WHERE id = ?").get(id); return r ? mapStudy(r) : null; },
    sites: (_, { page, limit, search, status }, { db }) => {
      const pg = page || 1, lim = limit || 10;
      let sql = "SELECT * FROM sites WHERE 1=1";
      const params = [];
      if (search) { const q = `%${search}%`; sql += " AND (name LIKE ? OR city LIKE ? OR country LIKE ?)"; params.push(q, q, q); }
      if (status) { sql += " AND status = ?"; params.push(status); }
      const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as c");
      const totalCount = db.prepare(countSql).get(...params).c;
      const totalPages = Math.ceil(totalCount / lim);
      sql += " LIMIT ? OFFSET ?";
      params.push(lim, (pg - 1) * lim);
      const data = db.prepare(sql).all(...params).map(mapSite);
      return { data, totalCount, totalPages };
    },
    site: (_, { id }, { db }) => { const r = db.prepare("SELECT * FROM sites WHERE id = ?").get(id); return r ? mapSite(r) : null; },
    examiners: (_, { page, limit, search }, { db }) => {
      const pg = page || 1, lim = limit || 10;
      let sql = "SELECT * FROM examiners WHERE 1=1";
      const params = [];
      if (search) { const q = `%${search}%`; sql += " AND (name LIKE ? OR role LIKE ?)"; params.push(q, q); }
      const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as c");
      const totalCount = db.prepare(countSql).get(...params).c;
      const totalPages = Math.ceil(totalCount / lim);
      sql += " LIMIT ? OFFSET ?";
      params.push(lim, (pg - 1) * lim);
      const data = db.prepare(sql).all(...params).map(mapExaminer);
      return { data, totalCount, totalPages };
    },
    examiner: (_, { id }, { db }) => { const r = db.prepare("SELECT * FROM examiners WHERE id = ?").get(id); return r ? mapExaminer(r) : null; },

    studiesBySite: (_, { siteId }, { db }) =>
      db.prepare("SELECT st.* FROM studies st JOIN study_sites ss ON st.id = ss.study_id WHERE ss.site_id = ? AND ss.status = 'Active'").all(siteId).map(mapStudy),

    examinersBySite: (_, { siteId }, { db }) =>
      db.prepare("SELECT e.* FROM examiners e JOIN site_examiners se ON e.id = se.examiner_id WHERE se.site_id = ? AND se.status = 'Active'").all(siteId).map(mapExaminer),

    certifiedExaminersForStudy: (_, { siteId, studyId }, { db }) => {
      const today = new Date().toISOString().split("T")[0];
      return db.prepare(`SELECT DISTINCT e.* FROM examiners e
        JOIN site_examiners se ON e.id = se.examiner_id
        JOIN certificates c ON c.examiner_id = e.id AND c.study_id = ?
        WHERE se.site_id = ? AND se.status = 'Active' AND c.expiry_date > ?
        AND e.id NOT IN (
          SELECT examiner_id FROM study_site_examiners
          WHERE study_id = ? AND site_id = ? AND status = 'Active'
        )`).all(studyId, siteId, today, studyId, siteId).map(mapExaminer);
    },

    assignedSiteIdsForStudy: (_, { studyId }, { db }) =>
      db.prepare("SELECT site_id FROM study_sites WHERE study_id = ? AND status = 'Active'").all(studyId).map(r => String(r.site_id)),

    auditLogs: (_, { entity, entityId }, { db }) => {
      const rows = db.prepare(
        "SELECT * FROM audit_logs WHERE entity = ? AND entity_id = ? ORDER BY created_at DESC"
      ).all(entity, entityId);
      return rows.map(r => ({ id: r.id, action: r.action, entity: r.entity, entityId: r.entity_id, details: r.details, createdAt: r.created_at }));
    },

    recentActivities: (_, { limit }, { db }) => {
      const l = limit || 10;
      const rows = db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?").all(l);
      return rows.map(r => ({ id: r.id, action: r.action, entity: r.entity, entityId: r.entity_id, details: r.details, createdAt: r.created_at }));
    },

    dashboard: (_, __, { db }) => {
      const totalStudies = db.prepare("SELECT COUNT(*) as c FROM studies").get().c;
      const activeSites = db.prepare("SELECT COUNT(*) as c FROM sites WHERE status = 'Active'").get().c;
      const totalExaminers = db.prepare("SELECT COUNT(*) as c FROM examiners").get().c;
      const studyByStatus = db.prepare("SELECT status as name, COUNT(*) as value FROM studies GROUP BY status").all();
      const siteByStatus = db.prepare("SELECT status as name, COUNT(*) as value FROM sites GROUP BY status").all();
      const examinerByRole = db.prepare("SELECT role as name, COUNT(*) as value FROM examiners GROUP BY role").all();
      const dist = db.prepare(`
        SELECT s.name as study_name, s.phase, s.status, COUNT(ss.site_id) as site_count
        FROM studies s LEFT JOIN study_sites ss ON s.id = ss.study_id AND ss.status = 'Active' GROUP BY s.id
      `).all().map(r => ({ studyName: r.study_name, siteCount: r.site_count, phase: r.phase, status: r.status }));
      return { totalStudies, activeSites, totalExaminers, studyByStatus, siteByStatus, examinerByRole, studySiteDistribution: dist };
    },

    search: (_, { query, phase, status }, { db }) => {
      const q = `%${query}%`;
      let studySql = "SELECT * FROM studies WHERE (name LIKE ? OR sponsor LIKE ? OR phase LIKE ? OR protocol_id LIKE ?)";
      const studyParams = [q, q, q, q];
      if (phase) { studySql += " AND phase = ?"; studyParams.push(phase); }
      if (status) { studySql += " AND status = ?"; studyParams.push(status); }
      const studies = db.prepare(studySql).all(...studyParams).map(mapStudy);
      let siteSql = "SELECT * FROM sites WHERE (name LIKE ? OR city LIKE ? OR country LIKE ?)";
      const siteParams = [q, q, q];
      if (status) { siteSql += " AND status = ?"; siteParams.push(status); }
      const sites = db.prepare(siteSql).all(...siteParams).map(mapSite);
      const examiners = db.prepare("SELECT * FROM examiners WHERE name LIKE ? OR role LIKE ?").all(q, q).map(mapExaminer);
      return { studies, sites, examiners };
    },
  },

  Study: {
    sites: (study, _, { db }) =>
      db.prepare("SELECT si.*, ss.status as assignment_status FROM sites si JOIN study_sites ss ON si.id = ss.site_id WHERE ss.study_id = ?").all(study.id).map(r => ({ ...mapSite(r), assignmentStatus: r.assignment_status })),
    examiners: (study, _, { db }) =>
      db.prepare(`SELECT e.*, sse.status as assignment_status, si.name as site_name
        FROM examiners e JOIN study_site_examiners sse ON e.id = sse.examiner_id
        JOIN sites si ON si.id = sse.site_id WHERE sse.study_id = ?`).all(study.id)
        .map(r => ({ ...mapExaminer(r), assignmentStatus: r.assignment_status, siteName: r.site_name })),
  },

  Site: {
    studies: (site, _, { db }) =>
      db.prepare("SELECT st.*, ss.status as assignment_status FROM studies st JOIN study_sites ss ON st.id = ss.study_id WHERE ss.site_id = ?").all(site.id).map(r => ({ ...mapStudy(r), assignmentStatus: r.assignment_status })),
    examiners: (site, _, { db }) => {
      const rows = db.prepare("SELECT e.*, se.status as assignment_status FROM examiners e JOIN site_examiners se ON e.id = se.examiner_id WHERE se.site_id = ?").all(site.id);
      return rows.map(r => {
        const studyNames = db.prepare(`SELECT st.name FROM studies st JOIN study_site_examiners sse ON st.id = sse.study_id
          WHERE sse.site_id = ? AND sse.examiner_id = ? AND sse.status = 'Active'`).all(site.id, r.id).map(s => s.name);
        return { ...mapExaminer(r), assignmentStatus: r.assignment_status, studyNames };
      });
    },
  },

  Examiner: {
    sites: (examiner, _, { db }) =>
      db.prepare("SELECT si.* FROM sites si JOIN site_examiners se ON si.id = se.site_id WHERE se.examiner_id = ? AND se.status = 'Active'").all(examiner.id).map(mapSite),
    studies: (examiner, _, { db }) =>
      db.prepare(`SELECT DISTINCT st.*, si.name as site_name FROM studies st
        JOIN study_site_examiners sse ON st.id = sse.study_id
        JOIN sites si ON si.id = sse.site_id
        WHERE sse.examiner_id = ?`).all(examiner.id)
        .map(r => ({ ...mapStudy(r), siteName: r.site_name })),
    certificates: (examiner, _, { db }) =>
      db.prepare(`SELECT c.*, st.name as study_name FROM certificates c
        JOIN studies st ON st.id = c.study_id WHERE c.examiner_id = ?`).all(examiner.id)
        .map(mapCertificate),
  },

  Mutation: {
    signup: (_, { username, password }, { db }) => {
      if (password.length < 8) return { success: false, message: "Password must be at least 8 characters.", user: null };
      if (!/[A-Z]/.test(password)) return { success: false, message: "Password must contain at least one uppercase letter.", user: null };
      if (!/[0-9]/.test(password)) return { success: false, message: "Password must contain at least one number.", user: null };
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return { success: false, message: "Password must contain at least one special character.", user: null };
      const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
      if (existing) return { success: false, message: "Username already taken. Please choose another.", user: null };
      const hashed = hashPassword(password);
      const result = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'viewer')").run(username, hashed);
      const user = { id: result.lastInsertRowid, username, role: "viewer" };
      return { success: true, message: "Signup successful!", user };
    },

    login: (_, { username, password }, { db }) => {
      const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
      if (!user) return { success: false, message: "Invalid username or password.", user: null };
      const valid = user.password.startsWith("$2") ? comparePassword(password, user.password) : password === user.password;
      if (!valid) return { success: false, message: "Invalid username or password.", user: null };
      // Migrate plain text password to bcrypt on successful login
      if (!user.password.startsWith("$2")) {
        db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashPassword(password), user.id);
      }
      const userData = { id: user.id, username: user.username, role: user.role };
      const accessToken = generateAccessToken(userData);
      const refreshToken = generateRefreshToken(userData);
      return { success: true, message: "Login successful!", user: userData, accessToken, refreshToken };
    },

    createStudy: (_, { name, sponsor, phase, startDate, endDate }, { db }) => {
      const protocolId = generateProtocolId(db, name, sponsor);
      const result = db.prepare(
        "INSERT INTO studies (name, sponsor, phase, protocol_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(name, sponsor || null, phase || null, protocolId, startDate || null, endDate || null, "Planned");
      audit(db, "CREATE", "study", result.lastInsertRowid, `Created study: ${name} (${protocolId})`);
      return { id: result.lastInsertRowid, name, sponsor, phase, protocolId, startDate, endDate, status: "Planned", sites: [], examiners: [] };
    },

    createSite: (_, { name, city, country }, { db }) => {
      const result = db.prepare("INSERT INTO sites (name, city, country, status) VALUES (?, ?, ?, ?)").run(name, city || null, country || null, "Planned");
      audit(db, "CREATE", "site", result.lastInsertRowid, `Created site: ${name}`);
      return { id: result.lastInsertRowid, name, city, country, status: "Planned", studies: [], examiners: [] };
    },

    createExaminer: (_, { name, role }, { db }) => {
      const r = role || "Principal Investigator";
      const result = db.prepare("INSERT INTO examiners (name, role) VALUES (?, ?)").run(name, r);
      audit(db, "CREATE", "examiner", result.lastInsertRowid, `Created examiner: ${name}`);
      return { id: result.lastInsertRowid, name, role: r, sites: [], studies: [] };
    },

    // Only Active sites can be assigned to a study, with selected examiners
    assignSitesToStudy: (_, { studyId, siteIds, examinerIds }, { db }) => {
      const siteIns = db.prepare("INSERT OR REPLACE INTO study_sites (study_id, site_id, status) VALUES (?, ?, 'Active')");
      const sseIns = db.prepare("INSERT OR IGNORE INTO study_site_examiners (study_id, site_id, examiner_id) VALUES (?, ?, ?)");
      const assigned = [];
      for (const siteId of siteIds) {
        const site = db.prepare("SELECT status, name FROM sites WHERE id = ?").get(siteId);
        if (!site || site.status !== "Active") continue;
        siteIns.run(studyId, siteId);
        assigned.push(site.name);
        const studyName = getName(db, "studies", studyId);
        audit(db, "ASSIGN", "study", studyId, `Assigned site: ${site.name}`);
        audit(db, "ASSIGN", "site", siteId, `Assigned to study: ${studyName}`);

        // Assign selected examiners that have valid certificates for this study
        if (examinerIds && examinerIds.length > 0) {
          const today = new Date().toISOString().split("T")[0];
          const siteExaminerIds = db.prepare("SELECT examiner_id FROM site_examiners WHERE site_id = ? AND status = 'Active'").all(siteId).map(r => String(r.examiner_id));
          for (const eid of examinerIds) {
            if (!siteExaminerIds.includes(String(eid))) continue;
            const cert = db.prepare("SELECT id FROM certificates WHERE examiner_id = ? AND study_id = ? AND expiry_date > ?").get(eid, studyId, today);
            if (!cert) continue;
            sseIns.run(studyId, siteId, eid);
            const eName = getName(db, "examiners", eid);
            audit(db, "ASSIGN", "study", studyId, `Examiner assigned: ${eName} at site: ${site.name}`);
          }
        }
      }
      if (assigned.length > 0) recomputeStudyStatus(db, studyId);
      return { success: true, message: assigned.length > 0 ? `${assigned.length} active site(s) assigned.` : "No active sites to assign." };
    },

    // Assign examiner to site only (no study assignment here)
    assignExaminerToSite: (_, { examinerId, siteId }, { db }) => {
      db.prepare("INSERT OR REPLACE INTO site_examiners (site_id, examiner_id, status) VALUES (?, ?, 'Active')").run(siteId, examinerId);
      const examinerName = getName(db, "examiners", examinerId);
      const siteName = getName(db, "sites", siteId);
      audit(db, "ASSIGN", "examiner", examinerId, `Assigned to site: ${siteName}`);
      audit(db, "ASSIGN", "site", siteId, `Examiner assigned: ${examinerName}`);
      recomputeSiteStatus(db, siteId);
      return { success: true, message: `Examiner "${examinerName}" assigned to "${siteName}".` };
    },

    // Unassign site from study → mark examiners as Removed (not delete), recompute study status
    unassignSiteFromStudy: (_, { studyId, siteId }, { db }) => {
      db.prepare("UPDATE study_sites SET status = 'Removed' WHERE study_id = ? AND site_id = ?").run(studyId, siteId);
      const removedExaminers = db.prepare("SELECT examiner_id FROM study_site_examiners WHERE study_id = ? AND site_id = ? AND status = 'Active'").all(studyId, siteId);
      db.prepare("UPDATE study_site_examiners SET status = 'Removed' WHERE study_id = ? AND site_id = ?").run(studyId, siteId);

      const siteName = getName(db, "sites", siteId);
      const studyName = getName(db, "studies", studyId);
      audit(db, "UNASSIGN", "study", studyId, `Site removed: ${siteName}`);
      audit(db, "UNASSIGN", "site", siteId, `Removed from study: ${studyName}`);
      for (const { examiner_id } of removedExaminers) {
        const eName = getName(db, "examiners", examiner_id);
        audit(db, "UNASSIGN", "study", studyId, `Examiner auto-removed: ${eName} (site ${siteName} unassigned)`);
      }
      recomputeStudyStatus(db, studyId);
      return { success: true, message: "Site unassigned. Related examiners marked as Removed." };
    },

    // Reassign site → also restore examiner links
    reassignSiteToStudy: (_, { studyId, siteId }, { db }) => {
      const site = db.prepare("SELECT status, name FROM sites WHERE id = ?").get(siteId);
      if (!site || site.status !== "Active") return { success: false, message: "Site must be Active to reassign." };
      db.prepare("UPDATE study_sites SET status = 'Active' WHERE study_id = ? AND site_id = ?").run(studyId, siteId);
      // Restore examiner links that were removed with this site (only if examiner is still active on the site)
      const removedLinks = db.prepare("SELECT examiner_id FROM study_site_examiners WHERE study_id = ? AND site_id = ? AND status = 'Removed'").all(studyId, siteId);
      for (const { examiner_id } of removedLinks) {
        const seActive = db.prepare("SELECT status FROM site_examiners WHERE site_id = ? AND examiner_id = ?").get(siteId, examiner_id);
        if (seActive && seActive.status === "Active") {
          db.prepare("UPDATE study_site_examiners SET status = 'Active' WHERE study_id = ? AND site_id = ? AND examiner_id = ?").run(studyId, siteId, examiner_id);
          const eName = getName(db, "examiners", examiner_id);
          audit(db, "REASSIGN", "study", studyId, `Examiner auto-reassigned: ${eName} (site ${site.name} reassigned)`);
        }
      }
      const studyName = getName(db, "studies", studyId);
      audit(db, "REASSIGN", "study", studyId, `Site reassigned: ${site.name}`);
      audit(db, "REASSIGN", "site", siteId, `Reassigned to study: ${studyName}`);
      recomputeStudyStatus(db, studyId);
      return { success: true, message: `Site "${site.name}" reassigned with examiners.` };
    },

    // Unassign examiner from site → mark study links as Removed (not delete), cascade
    unassignExaminerFromSite: (_, { siteId, examinerId }, { db }) => {
      db.prepare("UPDATE site_examiners SET status = 'Removed' WHERE site_id = ? AND examiner_id = ?").run(siteId, examinerId);
      // Mark study_site_examiners as Removed (not delete)
      db.prepare("UPDATE study_site_examiners SET status = 'Removed' WHERE site_id = ? AND examiner_id = ?").run(siteId, examinerId);

      const examinerName = getName(db, "examiners", examinerId);
      const siteName = getName(db, "sites", siteId);
      audit(db, "UNASSIGN", "site", siteId, `Examiner removed: ${examinerName}`);
      audit(db, "UNASSIGN", "examiner", examinerId, `Removed from site: ${siteName}`);

      recomputeSiteStatus(db, siteId);
      return { success: true, message: "Examiner unassigned." };
    },

    // Reassign examiner → also restore study links
    reassignExaminerToSite: (_, { siteId, examinerId }, { db }) => {
      db.prepare("UPDATE site_examiners SET status = 'Active' WHERE site_id = ? AND examiner_id = ?").run(siteId, examinerId);
      // Restore study links that were removed with this examiner (only if study-site link is active)
      const removedLinks = db.prepare("SELECT study_id FROM study_site_examiners WHERE site_id = ? AND examiner_id = ? AND status = 'Removed'").all(siteId, examinerId);
      for (const { study_id } of removedLinks) {
        const ssActive = db.prepare("SELECT status FROM study_sites WHERE study_id = ? AND site_id = ?").get(study_id, siteId);
        if (ssActive && ssActive.status === "Active") {
          db.prepare("UPDATE study_site_examiners SET status = 'Active' WHERE study_id = ? AND site_id = ? AND examiner_id = ?").run(study_id, siteId, examinerId);
          const studyName = getName(db, "studies", study_id);
          audit(db, "REASSIGN", "study", study_id, `Examiner auto-reassigned: ${getName(db, "examiners", examinerId)} at site: ${getName(db, "sites", siteId)}`);
        }
      }
      const examinerName = getName(db, "examiners", examinerId);
      const siteName = getName(db, "sites", siteId);
      audit(db, "REASSIGN", "site", siteId, `Examiner reassigned: ${examinerName}`);
      audit(db, "REASSIGN", "examiner", examinerId, `Reassigned to site: ${siteName}`);
      recomputeSiteStatus(db, siteId);
      return { success: true, message: `Examiner "${examinerName}" reassigned with studies.` };
    },

    updateStudy: (_, { id, name, sponsor, phase, startDate, endDate, status }, { db }) => {
      const cur = db.prepare("SELECT * FROM studies WHERE id = ?").get(id);
      const newName = name ?? cur.name, newSponsor = sponsor ?? cur.sponsor, newPhase = phase ?? cur.phase;
      const newStart = startDate ?? cur.start_date, newEnd = endDate ?? cur.end_date, newStatus = status ?? cur.status;
      db.prepare("UPDATE studies SET name=?, sponsor=?, phase=?, start_date=?, end_date=?, status=? WHERE id=?").run(
        newName, newSponsor, newPhase, newStart, newEnd, newStatus, id
      );
      const changes = [];
      if (newName !== cur.name) changes.push(`name: "${cur.name}" → "${newName}"`);
      if (newSponsor !== cur.sponsor) changes.push(`sponsor: "${cur.sponsor || '—'}" → "${newSponsor || '—'}"`);
      if (newPhase !== cur.phase) changes.push(`phase: "${cur.phase || '—'}" → "${newPhase || '—'}"`);
      if (newStart !== cur.start_date) changes.push(`start_date: "${cur.start_date || '—'}" → "${newStart || '—'}"`);
      if (newEnd !== cur.end_date) changes.push(`end_date: "${cur.end_date || '—'}" → "${newEnd || '—'}"`);
      if (newStatus !== cur.status) changes.push(`status: "${cur.status}" → "${newStatus}"`);
      audit(db, "UPDATE", "study", id, changes.length ? `Updated: ${changes.join(", ")}` : "No fields changed");
      const r = db.prepare("SELECT * FROM studies WHERE id = ?").get(id);
      return mapStudy(r);
    },

    updateSite: (_, { id, name, city, country, status }, { db }) => {
      const cur = db.prepare("SELECT * FROM sites WHERE id = ?").get(id);
      const newName = name ?? cur.name, newCity = city ?? cur.city, newCountry = country ?? cur.country, newStatus = status ?? cur.status;
      db.prepare("UPDATE sites SET name=?, city=?, country=?, status=? WHERE id=?").run(newName, newCity, newCountry, newStatus, id);
      const changes = [];
      if (newName !== cur.name) changes.push(`name: "${cur.name}" → "${newName}"`);
      if (newCity !== cur.city) changes.push(`city: "${cur.city || '—'}" → "${newCity || '—'}"`);
      if (newCountry !== cur.country) changes.push(`country: "${cur.country || '—'}" → "${newCountry || '—'}"`);
      if (newStatus !== cur.status) changes.push(`status: "${cur.status}" → "${newStatus}"`);
      audit(db, "UPDATE", "site", id, changes.length ? `Updated: ${changes.join(", ")}` : "No fields changed");
      const r = db.prepare("SELECT * FROM sites WHERE id = ?").get(id);
      return mapSite(r);
    },

    updateExaminer: (_, { id, name, role }, { db }) => {
      const cur = db.prepare("SELECT * FROM examiners WHERE id = ?").get(id);
      const newName = name ?? cur.name, newRole = role ?? cur.role;
      db.prepare("UPDATE examiners SET name=?, role=? WHERE id=?").run(newName, newRole, id);
      const changes = [];
      if (newName !== cur.name) changes.push(`name: "${cur.name}" → "${newName}"`);
      if (newRole !== cur.role) changes.push(`role: "${cur.role}" → "${newRole}"`);
      audit(db, "UPDATE", "examiner", id, changes.length ? `Updated: ${changes.join(", ")}` : "No fields changed");
      const r = db.prepare("SELECT * FROM examiners WHERE id = ?").get(id);
      return mapExaminer(r);
    },

    addCertificate: (_, { examinerId, studyId, expiryDate }, { db }) => {
      const result = db.prepare("INSERT INTO certificates (examiner_id, study_id, expiry_date) VALUES (?, ?, ?)").run(examinerId, studyId, expiryDate);
      const examinerName = getName(db, "examiners", examinerId);
      const studyName = getName(db, "studies", studyId);
      audit(db, "CREATE", "examiner", examinerId, `Certificate added for study: ${studyName} (expires: ${expiryDate})`);
      const row = db.prepare("SELECT c.*, st.name as study_name FROM certificates c JOIN studies st ON st.id = c.study_id WHERE c.id = ?").get(result.lastInsertRowid);
      return mapCertificate(row);
    },

    updateCertificate: (_, { id, expiryDate }, { db }) => {
      const cur = db.prepare("SELECT * FROM certificates WHERE id = ?").get(id);
      if (!cur) throw new Error("Certificate not found");
      db.prepare("UPDATE certificates SET expiry_date = ? WHERE id = ?").run(expiryDate, id);
      const examinerName = getName(db, "examiners", cur.examiner_id);
      const studyName = getName(db, "studies", cur.study_id);
      audit(db, "UPDATE", "examiner", cur.examiner_id, `Certificate renewed for study: ${studyName} (new expiry: ${expiryDate})`);
      const row = db.prepare("SELECT c.*, st.name as study_name FROM certificates c JOIN studies st ON st.id = c.study_id WHERE c.id = ?").get(id);
      return mapCertificate(row);
    },
  },
};
