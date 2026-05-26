import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Studies from "./pages/Studies";
import Sites from "./pages/Sites";
import Examiners from "./pages/Examiners";
import Search from "./pages/Search";
import Navbar from "./components/Navbar";
import { colors } from "./styles";

export default function App() {
  // lazy initialization (The function runs only once (initial render))
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (u) => {
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u)); //  localStorage only stores strings So object → string conversion

  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <div style={{ background: colors.bg, minHeight: "100vh" }}>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Dashboard user={user} />} />
        <Route path="/studies" element={<Studies isAdmin={isAdmin} />} />
        <Route path="/sites" element={<Sites isAdmin={isAdmin} />} />
        <Route path="/examiners" element={<Examiners isAdmin={isAdmin} />} />
        <Route path="/search" element={<Search />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
