import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { useNavigate, Link } from "react-router-dom";
import { colors } from "../styles";

const SIGNUP = gql`
  mutation Signup($username: String!, $password: String!) {
    signup(username: $username, password: $password) {
      success
      message
      user { id username }
    }
  }
`;

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [signup] = useMutation(SIGNUP);
  const navigate = useNavigate();

  const rules = [
    { test: password.length >= 8, label: "At least 8 characters" },
    { test: /[A-Z]/.test(password), label: "One uppercase letter" },
    { test: /[0-9]/.test(password), label: "One number" },
    { test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), label: "One special character" },
  ];
  const allValid = rules.every(r => r.test);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!allValid) { setError("Password does not meet requirements."); return; }
    const { data } = await signup({ variables: { username, password } });
    if (data.signup.success) {
      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } else {
      setError(data.signup.message);
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
          <h2 style={{ margin: "0 0 4px", color: colors.text, fontSize: "24px", fontWeight: 700 }}>Create Account</h2>
          <p style={{ margin: "0 0 24px", color: colors.textLight, fontSize: "14px" }}>Join the clinical network</p>
          {error && <p style={styles.error}>{error}</p>}
          {success && <p style={styles.success}>{success}</p>}
          <label style={styles.label}>Username</label>
          <input placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} required style={styles.input} />
          <label style={styles.label}>Password</label>
          <input placeholder="Create a password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={styles.input} />
          {password && (
            <div style={{ marginBottom: "16px", marginTop: "-8px" }}>
              {rules.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: r.test ? colors.success : colors.textLight, marginBottom: "2px" }}>
                  <span>{r.test ? "✓" : "✗"}</span> {r.label}
                </div>
              ))}
            </div>
          )}
          <button type="submit" disabled={!allValid} style={{ ...styles.button, opacity: allValid ? 1 : 0.5 }}>Create Account</button>
          <p style={{ textAlign: "center", fontSize: "14px", color: colors.textLight, marginTop: "16px" }}>
            Already have an account? <Link to="/login" style={{ color: colors.primary, fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
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
  success: { color: colors.success, margin: "0 0 12px", fontSize: "13px", background: colors.successLight, padding: "10px 14px", borderRadius: "8px" },
};
