import { NavLink, useNavigate, Link, useLocation } from "react-router-dom";
import { colors } from "../styles";

const navItems = [
  { to: "/studies", label: "Studies", icon: "🧬" },
  { to: "/sites", label: "Sites", icon: "🏥" },
  { to: "/examiners", label: "Examiners", icon: "⚕️" },
  { to: "/search", label: "Search", icon: "🔍" },
];

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = user.username.charAt(0).toUpperCase();
  const isHome = location.pathname === "/";

  return (
    <nav style={styles.nav}>
      <Link to="/" style={{ ...styles.brand, ...(isHome ? styles.brandActive : {}) }}>
        🩺 Site Network
      </Link>
      <div style={styles.links}>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.activeLink : {}) })}>
            <span style={{ marginRight: "5px", fontSize: "15px" }}>{item.icon}</span>{item.label}
          </NavLink>
        ))}
      </div>
      <div style={styles.right}>
        <div style={styles.avatar} title={user.username}>{initial}</div>
        <button onClick={() => { onLogout(); navigate("/login"); }} style={styles.logoutBtn}>Logout</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 28px", height: "60px", background: "#fff",
    borderBottom: `1px solid ${colors.border}`, position: "sticky", top: 0, zIndex: 100,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    fontFamily: "'Inter', sans-serif",
  },
  brand: {
    fontWeight: 800, fontSize: "18px", color: colors.primary,
    textDecoration: "none", cursor: "pointer", letterSpacing: "-0.3px",
    padding: "6px 12px", borderRadius: "10px", transition: "all 0.2s",
  },
  brandActive: {
    background: colors.primaryLight, color: colors.primaryDark,
  },
  links: { display: "flex", gap: "4px" },
  link: {
    textDecoration: "none", color: colors.textLight, padding: "8px 16px",
    borderRadius: "10px", fontSize: "14px", fontWeight: 500,
    display: "flex", alignItems: "center", transition: "all 0.2s",
  },
  activeLink: { background: colors.primaryLight, color: colors.primaryDark, fontWeight: 600 },
  right: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: {
    width: "38px", height: "38px", borderRadius: "50%",
    background: colors.gradient, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: "16px",
    boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)",
  },
  logoutBtn: {
    padding: "7px 16px", cursor: "pointer", border: `1px solid ${colors.border}`,
    borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 500,
    color: colors.textLight, transition: "all 0.2s",
  },
};
