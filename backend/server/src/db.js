import Database from "better-sqlite3";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(resolve(__dirname, "database.sqlite"));
console.log("Database path:", resolve(__dirname, "database.sqlite"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'viewer'
  );

  CREATE TABLE IF NOT EXISTS studies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sponsor TEXT,
    phase TEXT,
    protocol_id TEXT UNIQUE,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'Planned'
  );

  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    city TEXT,
    country TEXT,
    status TEXT DEFAULT 'Planned'
  );

  CREATE TABLE IF NOT EXISTS examiners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'Principal Investigator'
  );

  CREATE TABLE IF NOT EXISTS study_sites (
    study_id INTEGER NOT NULL,
    site_id INTEGER NOT NULL,
    status TEXT DEFAULT 'Active',
    PRIMARY KEY (study_id, site_id),
    FOREIGN KEY (study_id) REFERENCES studies(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS site_examiners (
    site_id INTEGER NOT NULL,
    examiner_id INTEGER NOT NULL,
    status TEXT DEFAULT 'Active',
    PRIMARY KEY (site_id, examiner_id),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (examiner_id) REFERENCES examiners(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS study_site_examiners (
    study_id INTEGER NOT NULL,
    site_id INTEGER NOT NULL,
    examiner_id INTEGER NOT NULL,
    status TEXT DEFAULT 'Active',
    PRIMARY KEY (study_id, site_id, examiner_id),
    FOREIGN KEY (study_id) REFERENCES studies(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (examiner_id) REFERENCES examiners(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_studies_name ON studies(name);
  CREATE INDEX IF NOT EXISTS idx_studies_status ON studies(status);
  CREATE INDEX IF NOT EXISTS idx_sites_name ON sites(name);
  CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
  CREATE INDEX IF NOT EXISTS idx_examiners_name ON examiners(name);
  CREATE INDEX IF NOT EXISTS idx_examiners_role ON examiners(role);
  CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entity_id);

  CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    examiner_id INTEGER NOT NULL,
    study_id INTEGER NOT NULL,
    expiry_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (examiner_id) REFERENCES examiners(id) ON DELETE CASCADE,
    FOREIGN KEY (study_id) REFERENCES studies(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_certificates_examiner ON certificates(examiner_id);
`);

// Seed admin
const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", "12", "admin");
}

// Seed studies (12)
const studyCount = db.prepare("SELECT COUNT(*) as c FROM studies").get();
if (studyCount.c === 0) {
  const ins = db.prepare("INSERT INTO studies (name, sponsor, phase, protocol_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
  ins.run("Cardio Trial A", "PharmaCorp", "Phase III", "CP-0001", "2024-01-15", "2025-06-30", "Active");
  ins.run("Neuro Study B", "BioMed Inc", "Phase II", "NB-0002", "2024-03-01", "2025-03-01", "Active");
  ins.run("Oncology Research C", "HealthGen", "Phase I", "OH-0003", "2025-01-01", "2026-12-31", "Active");
  ins.run("Diabetes Prevention D", "WellCare Labs", "Phase IV", "DW-0004", "2023-06-01", "2024-12-31", "Completed");
  ins.run("Pulmonary Study E", "LungCare Pharma", "Phase II", "PL-0005", "2025-02-01", "2026-08-31", "Active");
  ins.run("Dermatology Trial F", "SkinHealth Co", "Phase III", "DS-0006", "2024-06-01", "2025-12-31", "Active");
  ins.run("Hepatology Study G", "LiverCare Inc", "Phase I", "HL-0007", "2025-03-01", "2026-09-30", "Active");
  ins.run("Ophthalmology Trial H", "VisionMed", "Phase II", "OV-0008", "2024-07-01", "2025-07-01", "Active");
  ins.run("Rheumatology Study I", "JointHealth", "Phase III", "RJ-0009", "2024-09-01", "2026-03-31", "Active");
  ins.run("Endocrine Trial J", "HormoneLab", "Phase I", "EH-0010", "2025-05-01", "2027-01-31", "Active");
  ins.run("Gastro Research K", "GutWell Corp", "Phase IV", "GG-0011", "2023-01-01", "2024-06-30", "Completed");
  ins.run("Immunology Trial L", "ImmunoGen", "Phase II", "II-0012", "2025-06-01", "2027-06-30", "Active");
}

// Seed sites (12) — sites with examiners will be Active
const siteCount = db.prepare("SELECT COUNT(*) as c FROM sites").get();
if (siteCount.c === 0) {
  const ins = db.prepare("INSERT INTO sites (name, city, country, status) VALUES (?, ?, ?, ?)");
  ins.run("City General Hospital", "New York", "USA", "Active");
  ins.run("Berlin Research Center", "Berlin", "Germany", "Active");
  ins.run("Tokyo Medical Institute", "Tokyo", "Japan", "Active");
  ins.run("London Clinical Hub", "London", "UK", "Active");
  ins.run("Sydney Health Clinic", "Sydney", "Australia", "Active");
  ins.run("Mumbai Research Lab", "Mumbai", "India", "Active");
  ins.run("Toronto Medical Center", "Toronto", "Canada", "Active");
  ins.run("Paris Clinical Center", "Paris", "France", "Active");
  ins.run("Seoul University Hospital", "Seoul", "South Korea", "Active");
  ins.run("Sao Paulo Research Clinic", "Sao Paulo", "Brazil", "Active");
  ins.run("Cape Town Medical Hub", "Cape Town", "South Africa", "Active");
  ins.run("Dubai Health Institute", "Dubai", "UAE", "Active");
}

// Seed examiners (12)
const examinerCount = db.prepare("SELECT COUNT(*) as c FROM examiners").get();
if (examinerCount.c === 0) {
  const ins = db.prepare("INSERT INTO examiners (name, role) VALUES (?, ?)");
  ins.run("Dr. Sarah Johnson", "Principal Investigator");
  ins.run("Dr. Michael Chen", "Sub-Investigator");
  ins.run("Dr. Emily Watson", "Principal Investigator");
  ins.run("Dr. Raj Patel", "Sub-Investigator");
  ins.run("Dr. Anna Mueller", "Principal Investigator");
  ins.run("Dr. James Lee", "Sub-Investigator");
  ins.run("Dr. Maria Garcia", "Principal Investigator");
  ins.run("Dr. David Kim", "Sub-Investigator");
  ins.run("Dr. Lisa Brown", "Principal Investigator");
  ins.run("Dr. Kenji Tanaka", "Sub-Investigator");
  ins.run("Dr. Fatima Al-Rashid", "Principal Investigator");
  ins.run("Dr. Carlos Rivera", "Sub-Investigator");
}

// Seed study-site relationships
const ssCount = db.prepare("SELECT COUNT(*) as c FROM study_sites").get();
if (ssCount.c === 0) {
  const ins = db.prepare("INSERT INTO study_sites (study_id, site_id) VALUES (?, ?)");
  ins.run(1, 1); ins.run(1, 2); ins.run(1, 3);
  ins.run(2, 1); ins.run(2, 4);
  ins.run(3, 2); ins.run(3, 5);
  ins.run(4, 3); ins.run(4, 6);
  ins.run(5, 5); ins.run(5, 8);
  ins.run(6, 1); ins.run(6, 8);
  ins.run(7, 9); ins.run(7, 10);
  ins.run(8, 10); ins.run(8, 11);
  ins.run(9, 9); ins.run(9, 12);
  ins.run(10, 11); ins.run(10, 6);
  ins.run(11, 7); ins.run(11, 3);
  ins.run(12, 12); ins.run(12, 4);
}

// Seed site-examiner relationships
const seCount = db.prepare("SELECT COUNT(*) as c FROM site_examiners").get();
if (seCount.c === 0) {
  const ins = db.prepare("INSERT INTO site_examiners (site_id, examiner_id) VALUES (?, ?)");
  ins.run(1, 1); ins.run(1, 2);
  ins.run(2, 3); ins.run(2, 4);
  ins.run(3, 5); ins.run(3, 10);
  ins.run(4, 6);
  ins.run(5, 7); ins.run(5, 8);
  ins.run(6, 4);
  ins.run(7, 12);
  ins.run(8, 9); ins.run(8, 3);
  ins.run(9, 11); ins.run(9, 6);
  ins.run(10, 7); ins.run(10, 12);
  ins.run(11, 5); ins.run(11, 11);
  ins.run(12, 1); ins.run(12, 9);
}

// Seed study_site_examiners (link examiners to studies via their sites)
const sseCount = db.prepare("SELECT COUNT(*) as c FROM study_site_examiners").get();
if (sseCount.c === 0) {
  const ins = db.prepare("INSERT OR IGNORE INTO study_site_examiners (study_id, site_id, examiner_id) VALUES (?, ?, ?)");
  // For each study-site link, assign all examiners from that site
  const ssRows = db.prepare("SELECT study_id, site_id FROM study_sites").all();
  for (const { study_id, site_id } of ssRows) {
    const examiners = db.prepare("SELECT examiner_id FROM site_examiners WHERE site_id = ?").all(site_id);
    for (const { examiner_id } of examiners) {
      ins.run(study_id, site_id, examiner_id);
    }
  }
}

// Seed audit logs for seed data
const auditCount = db.prepare("SELECT COUNT(*) as c FROM audit_logs").get();
if (auditCount.c === 0) {
  const a = db.prepare("INSERT INTO audit_logs (action, entity, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?)");
  const studies = db.prepare("SELECT id, name, protocol_id FROM studies").all();
  studies.forEach(s => a.run("CREATE", "study", s.id, `Created study: ${s.name} (${s.protocol_id})`, "2024-01-01 09:00:00"));
  const sites = db.prepare("SELECT id, name FROM sites").all();
  sites.forEach(s => a.run("CREATE", "site", s.id, `Created site: ${s.name}`, "2024-01-01 09:00:00"));
  const examiners = db.prepare("SELECT id, name FROM examiners").all();
  examiners.forEach(e => a.run("CREATE", "examiner", e.id, `Created examiner: ${e.name}`, "2024-01-01 09:00:00"));
  const ssRows = db.prepare("SELECT ss.study_id, ss.site_id, st.name as study_name, si.name as site_name FROM study_sites ss JOIN studies st ON st.id=ss.study_id JOIN sites si ON si.id=ss.site_id").all();
  ssRows.forEach(r => {
    a.run("ASSIGN", "study", r.study_id, `Assigned site: ${r.site_name}`, "2024-01-02 10:00:00");
    a.run("ASSIGN", "site", r.site_id, `Assigned to study: ${r.study_name}`, "2024-01-02 10:00:00");
  });
  const seRows = db.prepare("SELECT se.site_id, se.examiner_id, si.name as site_name, e.name as examiner_name FROM site_examiners se JOIN sites si ON si.id=se.site_id JOIN examiners e ON e.id=se.examiner_id").all();
  seRows.forEach(r => {
    a.run("ASSIGN", "site", r.site_id, `Examiner assigned: ${r.examiner_name}`, "2024-01-03 11:00:00");
    a.run("ASSIGN", "examiner", r.examiner_id, `Assigned to site: ${r.site_name}`, "2024-01-03 11:00:00");
  });
}

// Seed certificates — every examiner-study link needs a valid certificate
const certCount = db.prepare("SELECT COUNT(*) as c FROM certificates").get();
if (certCount.c === 0) {
  const ins = db.prepare("INSERT OR IGNORE INTO certificates (examiner_id, study_id, expiry_date) VALUES (?, ?, ?)");
  const sseRows = db.prepare("SELECT DISTINCT examiner_id, study_id FROM study_site_examiners").all();
  sseRows.forEach(r => {
    // Random future date between 2026-01-01 and 2027-12-31
    const y = 2026 + Math.floor(Math.random() * 2);
    const m = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
    const d = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
    ins.run(r.examiner_id, r.study_id, `${y}-${m}-${d}`);
  });
}

export default db;
