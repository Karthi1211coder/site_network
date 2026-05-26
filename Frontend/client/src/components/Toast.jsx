import { useEffect } from "react";
import { colors } from "../styles";

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={styles.toast}>
      <span style={{ marginRight: "8px" }}>✅</span>
      {message}
    </div>
  );
}

const styles = {
  toast: {
    position: "fixed", bottom: "28px", right: "28px", zIndex: 300,
    background: colors.success, color: "#fff", padding: "14px 24px",
    borderRadius: "12px", fontSize: "14px", fontWeight: 600,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)", display: "flex", alignItems: "center",
    animation: "slideIn 0.3s ease",
  },
};
