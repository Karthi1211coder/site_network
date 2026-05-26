import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { useNavigate, Link } from "react-router-dom";
import { colors } from "../styles";

const LOGIN = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      success
      message
      user { id username role }
      accessToken
      refreshToken
    }
  }
`;

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [login] = useMutation(LOGIN);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { data } = await login({ variables: { username, password } });
    if (data.login.success) {
      localStorage.setItem("accessToken", data.login.accessToken);
      localStorage.setItem("refreshToken", data.login.refreshToken);
      onLogin(data.login.user);
      navigate("/");
    } else {
      setError(data.login.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <div style={styles.brandBox}>
          <span style={{ fontSize: "48px" }}>🩺</span>
          <h1 style={styles.brandTitle}>Site Network</h1>
          <p style={styles.brandSub}>Clinical Study Management Platform</p>
          <div style={styles.features}>
            <div style={styles.feature}><span>🧬</span> Manage clinical studies</div>
            <div style={styles.feature}><span>🏥</span> Track research sites</div>
            <div style={styles.feature}><span>⚕️</span> Coordinate examiners</div>
          </div>
        </div>
      </div>
      <div style={styles.right}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <h2 style={{ margin: "0 0 4px", color: colors.text, fontSize: "24px", fontWeight: 700 }}>Welcome back</h2>
          <p style={{ margin: "0 0 24px", color: colors.textLight, fontSize: "14px" }}>Sign in to your account</p>
          {error && <p style={styles.error}>{error}</p>}
          <label style={styles.label}>Username</label>
          <input placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} required style={styles.input} />
          <label style={styles.label}>Password</label>
          <input placeholder="Enter your password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={styles.input} />
          <button type="submit" style={styles.button}>Sign In</button>
          <p style={{ textAlign: "center", fontSize: "14px", color: colors.textLight, marginTop: "16px" }}>
            New user? <Link to="/signup" style={{ color: colors.primary, fontWeight: 600, textDecoration: "none" }}>Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif" },
  left: {
    flex: 1, background: colors.gradient, display: "flex",
    alignItems: "center", justifyContent: "center", padding: "40px",
  },
  brandBox: { color: "#fff", maxWidth: "380px" },
  brandTitle: { fontSize: "36px", fontWeight: 800, margin: "16px 0 8px" },
  brandSub: { fontSize: "16px", opacity: 0.85, marginBottom: "32px" },
  features: { display: "flex", flexDirection: "column", gap: "14px" },
  feature: {
    display: "flex", alignItems: "center", gap: "12px",
    fontSize: "15px", background: "rgba(255,255,255,0.15)",
    padding: "12px 16px", borderRadius: "12px",
  },
  right: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: colors.bg, padding: "40px" },
  form: { width: "380px" },
  label: { fontSize: "13px", fontWeight: 600, color: colors.text, marginBottom: "6px", display: "block" },
  input: {
    width: "100%", padding: "12px 16px", fontSize: "14px", borderRadius: "10px",
    border: `1px solid ${colors.border}`, marginBottom: "16px", outline: "none",
    transition: "border 0.2s", boxSizing: "border-box",
  },
  button: {
    width: "100%", padding: "13px", fontSize: "15px", fontWeight: 600,
    background: colors.gradient, color: "#fff", border: "none",
    borderRadius: "10px", cursor: "pointer", marginTop: "4px",
    boxShadow: "0 4px 14px rgba(13, 148, 136, 0.3)",
  },
  error: { color: colors.danger, margin: "0 0 12px", fontSize: "13px", background: "#fef2f2", padding: "10px 14px", borderRadius: "8px" },
};
