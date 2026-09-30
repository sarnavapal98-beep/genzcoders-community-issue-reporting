import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const initialRole = searchParams.get("role") === "admin" ? "admin" : "citizen";

  // Active role selector: "citizen" | "admin"
  const [activeRole, setActiveRole] = useState(initialRole);

  const [formData, setFormData] = useState({
    email: initialRole === "admin" ? "admin@community.local" : "tester@test.local",
    password: initialRole === "admin" ? "admin123" : "password123",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleSwitch = (role) => {
    setActiveRole(role);
    setError("");
    if (role === "admin") {
      setFormData({
        email: "admin@community.local",
        password: "admin123",
      });
    } else {
      setFormData({
        email: "tester@test.local",
        password: "password123",
      });
    }
  };

  const handleDemoFill = (role) => {
    setError("");
    if (role === "admin") {
      setFormData({
        email: "admin@community.local",
        password: "admin123",
      });
    } else {
      setFormData({
        email: "tester@test.local",
        password: "password123",
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);
      const loggedInUser = result.user;

      if (loggedInUser?.role === "staff" || loggedInUser?.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (from) {
        navigate(from, { replace: true });
      } else {
        // Redirect citizen to community feed
        navigate("/community-reports", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background Ambient Glow Elements */}
      <div className="ambient-glow glow-1" />
      <div className="ambient-glow glow-2" />
      <div className="ambient-grid" />

      <div className="auth-container">
        {/* Left Side: Brand & Feature Showcase */}
        <div className="auth-brand">
          <div className="auth-brand-ambient" />

          {/* Live System Badge */}
          <div className="civic-badge">
            <span className="live-pulse" />
            <span>Official Civic Platform • AI-Powered</span>
          </div>

          {/* Logo & Headline */}
          <div className="brand-header">
            <div className="brand-icon-wrapper">
              <svg
                className="brand-svg-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L3 7V12C3 17.52 6.84 22.74 12 24C17.16 22.74 21 17.52 21 12V7L12 2Z"
                  fill="url(#shield-grad)"
                />
                <path
                  d="M10 15.5L6.5 12L7.91 10.59L10 12.67L16.09 6.58L17.5 8L10 15.5Z"
                  fill="#ffffff"
                />
                <defs>
                  <linearGradient id="shield-grad" x1="3" y1="2" x2="21" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#14b8a6" />
                    <stop offset="1" stopColor="#0f766e" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1 className="brand-title">
                Community <span className="highlight-text">Reports</span>
              </h1>
              <p className="brand-tagline">
                AI-driven civic reporting to transform our neighborhoods together.
              </p>
            </div>
          </div>

          {/* Feature Showcase Cards */}
          <div className="feature-cards">
            <div className="feature-card">
              <div className="feature-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <div className="feature-card-content">
                <h4>AI Vision Classification</h4>
                <p>Instant detection of potholes, water leaks, streetlights, and trash.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div className="feature-card-content">
                <h4>Direct Municipal Routing</h4>
                <p>Automated dispatch straight to Road, Water, Infrastructure &amp; Sanitation desks.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="feature-card-content">
                <h4>Live Community Tracking</h4>
                <p>Transparent real-time status updates from reported to completed resolution.</p>
              </div>
            </div>
          </div>

          {/* Civic Impact Metrics */}
          <div className="impact-metrics">
            <div className="metric-item">
              <strong>98.4%</strong>
              <span>Triage Precision</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <strong>&lt; 24h</strong>
              <span>Avg. Response</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <strong>1,400+</strong>
              <span>Issues Solved</span>
            </div>
          </div>
        </div>

        {/* Right Side: Dual Role Login Form Card */}
        <div className="auth-card">
          {/* Active Session Notice if logged in */}
          {user && (
            <div className="active-session-banner">
              <div className="active-session-info">
                <span className="session-dot" />
                <span>Currently signed in: <strong>{user.name}</strong> ({user.role})</span>
              </div>
              <Link
                to={user.role === "admin" || user.role === "staff" ? "/admin" : "/community-reports"}
                className="continue-session-btn"
              >
                Go to {user.role === "admin" || user.role === "staff" ? "Admin" : "Community Feed"} →
              </Link>
            </div>
          )}

          {/* Dual Portal Switcher Tabs */}
          <div className="portal-switcher">
            <button
              type="button"
              className={`portal-tab ${activeRole === "citizen" ? "active" : ""}`}
              onClick={() => handleRoleSwitch("citizen")}
            >
              <span className="portal-tab-icon">👤</span>
              <span className="portal-tab-label">Citizen Login</span>
            </button>

            <button
              type="button"
              className={`portal-tab ${activeRole === "admin" ? "active admin-active" : ""}`}
              onClick={() => handleRoleSwitch("admin")}
            >
              <span className="portal-tab-icon">🛡️</span>
              <span className="portal-tab-label">Admin / Staff</span>
            </button>
          </div>

          {/* Dynamic Card Header */}
          <div className="auth-card-header">
            {activeRole === "citizen" ? (
              <>
                <span className="card-badge">PUBLIC CIVIC PORTAL</span>
                <h2>Citizen Sign In</h2>
                <p className="auth-card-description">
                  Sign in to view the community feed, track your issue reports, and submit new local issues.
                </p>
              </>
            ) : (
              <>
                <span className="card-badge admin-badge">MUNICIPAL DESK</span>
                <h2>Admin &amp; Staff Sign In</h2>
                <p className="auth-card-description">
                  Authorized access for city departments, dispatch officers, and municipal administrators.
                </p>
              </>
            )}
          </div>

          {/* Quick Demo Pre-fill Button */}
          <div className="quick-demo-wrapper">
            <button
              type="button"
              className={`quick-demo-btn ${activeRole === "admin" ? "admin-demo" : ""}`}
              onClick={() => handleDemoFill(activeRole)}
              title="Click to auto-fill credentials for this portal"
            >
              <span>
                ⚡ Auto-fill <strong>{activeRole === "admin" ? "admin@community.local" : "tester@test.local"}</strong>
              </span>
              <span className={`demo-chip-action ${activeRole === "admin" ? "admin-chip" : ""}`}>
                Fill Demo
              </span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                {activeRole === "admin" ? "Staff Email Address" : "Citizen Email Address"} <span>*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-input has-icon"
                  placeholder={activeRole === "admin" ? "admin@community.local" : "name@example.com"}
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="password" className="form-label">
                  Password <span>*</span>
                </label>
              </div>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="form-input has-icon has-toggle"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="form-extra-row">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="custom-checkmark" />
                <span className="checkbox-label">Keep me signed in</span>
              </label>
              <a
                href="#forgot"
                className="forgot-password-link"
                onClick={(e) => {
                  e.preventDefault();
                  alert("To reset your password, contact your municipal administrator at road@community.local or re-register.");
                }}
              >
                Forgot password?
              </a>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className={`btn ${activeRole === "admin" ? "btn-admin-submit" : "btn-primary"} btn-full btn-submit`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>
                    {activeRole === "admin" ? "Sign In as Administrator →" : "Sign In & View Community Feed →"}
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Dynamic Footer for Citizen vs Admin */}
          {activeRole === "citizen" ? (
            <div className="auth-footer">
              <span>Don't have a citizen account?</span>
              <Link to="/register" className="auth-link-highlight">
                Create an account →
              </Link>
            </div>
          ) : (
            <div className="auth-footer" style={{ justifyContent: "center" }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                🔒 Municipal accounts are managed by City Administration.
              </span>
            </div>
          )}

          {/* Security Assurance Badge */}
          <div className="security-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>256-Bit SSL Encrypted • Official Community Service</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
