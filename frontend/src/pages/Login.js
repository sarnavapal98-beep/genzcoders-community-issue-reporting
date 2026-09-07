import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
   * If a protected page redirected the user to login,
   * remember where they originally wanted to go.
   */
  const from = location.state?.from?.pathname || null;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
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

      /*
       * Staff/admin users go to the dashboard.
       * Citizens go to the report page.
       */
      if (
        loggedInUser?.role === "staff" ||
        loggedInUser?.role === "admin"
      ) {
        navigate("/admin", { replace: true });
      } else if (from) {
        navigate(from, { replace: true });
      } else {
        navigate("/report", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">

        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-icon">
            CR
          </div>

          <h1>Community Reports</h1>

          <p>
            Report local issues and help improve your community.
          </p>
        </div>

        {/* Login Card */}
        <div className="auth-card">

          <h2>Welcome Back</h2>

          <p className="auth-card-description">
            Sign in to manage your community reports.
          </p>

          {/* Error */}
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* Email */}
            <div className="form-group">
              <label
                htmlFor="email"
                className="form-label"
              >
                Email <span>*</span>
              </label>

              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label
                htmlFor="password"
                className="form-label"
              >
                Password <span>*</span>
              </label>

              <input
                id="password"
                name="password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>

          {/* Register */}
          <div className="auth-footer">
            Don't have an account?{" "}
            <Link to="/register">
              Create an account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;