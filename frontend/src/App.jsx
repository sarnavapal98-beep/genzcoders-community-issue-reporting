import React from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ReportIssue from "./pages/ReportIssue.jsx";
import MyReports from "./pages/MyReports.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

const LoadingScreen = () => (
  <div className="loading-page">
    <div className="loading-card">
      <div className="brand-mark small">CR</div>
      <div className="loading-spinner" />
      <p>Loading Community Reports…</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role !== "admin" && user.role !== "staff") return <Navigate to="/report" replace />;
  return children;
};

const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === "admin" || user?.role === "staff";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="navbar">
        <NavLink to="/report" className="brand-link" aria-label="Community Reports home">
          <span className="brand-mark">CR</span>
          <span>
            <strong>Community Reports</strong>
            <small>Make your neighborhood better</small>
          </span>
        </NavLink>

        <nav className="navbar-links" aria-label="Main navigation">
          <NavLink to="/report" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <span>＋</span> Report Issue
          </NavLink>
          <NavLink to="/my-reports" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <span>▣</span> My Reports
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <span>▦</span> Admin
            </NavLink>
          )}
        </nav>

        <div className="nav-user">
          <div className="user-avatar">{(user?.name || "U").charAt(0).toUpperCase()}</div>
          <div className="user-details">
            <strong>{user?.name || "User"}</strong>
            <span>{isAdmin ? user.role : "Citizen"}</span>
          </div>
          <button className="logout-button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className={`main-content ${location.pathname === "/report" ? "report-main" : ""}`}>
        {children}
      </main>
    </div>
  );
};

const ProtectedPage = ({ children, admin = false }) => {
  const PageGuard = admin ? AdminRoute : ProtectedRoute;
  return <PageGuard><AppShell>{children}</AppShell></PageGuard>;
};

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/report" element={<ProtectedPage><ReportIssue /></ProtectedPage>} />
    <Route path="/my-reports" element={<ProtectedPage><MyReports /></ProtectedPage>} />
    <Route path="/admin" element={<ProtectedPage admin><AdminDashboard /></ProtectedPage>} />
    <Route path="/" element={<Navigate to="/report" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
