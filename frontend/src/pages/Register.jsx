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

    if (!name) {
      return "Please enter your name.";
    }

    if (!email) {
      return "Please enter your email address.";
    }

    if (!email.includes("@")) {
      return "Please enter a valid email address.";
    }

    if (!contact) {
      return "Please enter your contact information.";
    }

    if (!formData.password) {
      return "Please enter a password.";
    }

    if (formData.password.length < 6) {
      return "Password must contain at least 6 characters.";
    }

    if (formData.password !== formData.confirmPassword) {
      return "Passwords do not match.";
    }

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

      setSuccess(result.message || "Registration successful.");

      /*
       * If the backend automatically logs the citizen in,
       * AuthContext will contain the user and we can go directly
       * to the report page.
       */
      if (result.user) {
        setTimeout(() => {
          navigate("/report", { replace: true });
        }, 700);
      } else {
        /*
         * If registration only creates the account,
         * send the user to the login page.
         */
        setTimeout(() => {
          navigate("/login", {
            replace: true,
            state: {
              registered: true,
            },
          });
        }, 1000);
      }
    } catch (err) {
      setError(err.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">

        {/* Brand Section */}
        <div className="auth-brand">
          <div className="auth-brand-icon">CR</div>

          <h1>Community Reports</h1>

          <p>
            Join your community and help report local issues.
          </p>
        </div>

        {/* Registration Card */}
        <div className="auth-card">

          <h2>Create Account</h2>

          <p className="auth-card-description">
            Register as a citizen to report and track community issues.
          </p>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* Name */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Full Name <span>*</span>
              </label>

              <input
                id="name"
                name="name"
                type="text"
                className="form-input"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email <span>*</span>
              </label>

              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Contact */}
            <div className="form-group">
              <label htmlFor="contact_info" className="form-label">
                Contact Information <span>*</span>
              </label>

              <input
                id="contact_info"
                name="contact_info"
                type="text"
                className="form-input"
                placeholder="Enter your phone number"
                value={formData.contact_info}
                onChange={handleChange}
                autoComplete="tel"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password <span>*</span>
              </label>

              <input
                id="password"
                name="password"
                type="password"
                className="form-input"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
              />

              <small className="form-help">
                Password must contain at least 6 characters.
              </small>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password <span>*</span>
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* Login Link */}
          <div className="auth-footer">
            Already have an account?{" "}
            <Link to="/login">
              Sign in
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;
