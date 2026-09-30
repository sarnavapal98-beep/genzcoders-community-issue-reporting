import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact_info: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const name = formData.name.trim();
    const email = formData.email.trim();
    const contact = formData.contact_info.trim();

    if (!name) return "Please enter your full name.";
    if (!email) return "Please enter your email address.";
    if (!email.includes("@")) return "Please enter a valid email address.";
    if (!contact) return "Please enter your contact information (phone number or address).";
    if (!formData.password) return "Please enter a password.";
    if (formData.password.length < 6) return "Password must contain at least 6 characters.";
    if (formData.password !== formData.confirmPassword) return "Passwords do not match.";

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        contact_info: formData.contact_info.trim(),
        password: formData.password,
      };

      const result = await register(userData);
      setSuccess(result.message || "Registration successful! Redirecting to report desk...");

      if (result.user) {
        setTimeout(() => {
          navigate("/report", { replace: true });
        }, 800);
      } else {
        setTimeout(() => {
          navigate("/login", {
            state: { registered: true },
          });
        }, 1200);
      }
    } catch (err) {
      setError(err.message || "Unable to create your account.");
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
            <span>Join 1,200+ Active Neighbors</span>
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
                  fill="url(#shield-grad-reg)"
                />
                <path
                  d="M10 15.5L6.5 12L7.91 10.59L10 12.67L16.09 6.58L17.5 8L10 15.5Z"
                  fill="#ffffff"
                />
                <defs>
                  <linearGradient id="shield-grad-reg" x1="3" y1="2" x2="21" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#14b8a6" />
                    <stop offset="1" stopColor="#0f766e" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1 className="brand-title">
                Citizen <span className="highlight-text">Registration</span>
              </h1>
              <p className="brand-tagline">
                Create an official account to submit local hazards, track municipal repair timelines, and help maintain neighborhood safety.
              </p>
            </div>
          </div>

          {/* Citizen Benefits Checklist */}
          <div className="feature-cards">
            <div className="feature-card">
              <div className="feature-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="feature-card-content">
                <h4>Direct Citizen Voice</h4>
                <p>Your reports immediately notify designated municipal departments.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div className="feature-card-content">
                <h4>Personal Issue Dashboard</h4>
                <p>Track repair progress with real-time status badges and officer logs.</p>
              </div>
            </div>
          </div>

          {/* Civic Impact Metrics */}
          <div className="impact-metrics">
            <div className="metric-item">
              <strong>100%</strong>
              <span>Civic Transparency</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <strong>Free</strong>
              <span>Public Service</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <strong>Secure</strong>
              <span>Encrypted Data</span>
            </div>
          </div>
        </div>

        {/* Right Side: Registration Form Card */}
        <div className="auth-card">
          <div className="auth-card-header">
            <span className="card-badge">NEW CITIZEN ONBOARDING</span>
            <h2>Create an Account</h2>
            <p className="auth-card-description">
              Fill in your details to start submitting and tracking community issues.
            </p>
          </div>

          {/* Error & Success Messages */}
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

          {success && (
            <div className="alert alert-success">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Full Name <span>*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="form-input has-icon"
                  placeholder="e.g. Jane Doe"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address <span>*</span>
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
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="form-group">
              <label htmlFor="contact_info" className="form-label">
                Phone Number / Contact <span>*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <input
                  id="contact_info"
                  name="contact_info"
                  type="text"
                  className="form-input has-icon"
                  placeholder="+1 (555) 000-0000"
                  value={formData.contact_info}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password <span>*</span> (min. 6 characters)
              </label>
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
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
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

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password <span>*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-input has-icon has-toggle"
                  placeholder="Repeat your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
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

            {/* Create Account Button */}
            <button
              type="submit"
              className="btn btn-primary btn-full btn-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  <span>Registering Account...</span>
                </>
              ) : (
                <>
                  <span>Create Citizen Account</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Login Footer Link */}
          <div className="auth-footer">
            <span>Already registered?</span>
            <Link to="/login" className="auth-link-highlight">
              Sign in to your account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
