```jsx
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";

/* =========================
   LOGIN FORM
========================= */

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_BASE + "/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Login failed.");
      }

      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Community Issue Reporting</h1>
        <p className="subtitle">Login to your account</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Email</label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
          />

          <label>Password</label>

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => onLogin({ showRegister: true })}
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}

/* =========================
   REGISTER FORM
========================= */

function RegisterForm({ onRegister }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email and password are required.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_BASE + "/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Registration failed.");
      }

      onRegister(data.user);
    } catch (err) {
      setError(err.message || "Unable to register.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="subtitle">Community Issue Reporting</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Name</label>

          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
            autoComplete="name"
          />

          <label>Email</label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
          />

          <label>Phone</label>

          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Enter your phone number"
            autoComplete="tel"
          />

          <label>Password</label>

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
            autoComplete="new-password"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => onRegister({ showLogin: true })}
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}

/* =========================
   REPORT FORM
========================= */

function ReportForm({ user, onCreated }) {
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [photo, setPhoto] = useState(null);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const response = await fetch(API_BASE + "/categories", {
        credentials: "include"
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function getLocation() {
    setError("");
    setMessage("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        setLocationLoading(false);
        setMessage("Location detected successfully.");
      },
      () => {
        setLocationLoading(false);
        setError("Unable to detect your location.");
      }
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("description", description.trim());
      formData.append("category_id", categoryId);

      if (latitude) {
        formData.append("latitude", latitude);
      }

      if (longitude) {
        formData.append("longitude", longitude);
      }

      if (photo) {
        formData.append("photo", photo);
      }

      const response = await fetch(API_BASE + "/reports", {
        method: "POST",
        credentials: "include",
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to create report.");
      }

      setDescription("");
      setCategoryId("");
      setLatitude("");
      setLongitude("");
      setPhoto(null);

      const fileInput = document.getElementById("report-photo");

      if (fileInput) {
        fileInput.value = "";
      }

      setMessage("Issue reported successfully.");

      if (onCreated) {
        onCreated(data.report);
      }
    } catch (err) {
      setError(err.message || "Unable to create report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2>Report a Community Issue</h2>

      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}

      <form onSubmit={handleSubmit}>
        <label>Description</label>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe the issue..."
          rows="5"
        />

        <label>Category</label>

        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">Select category</option>

          {categories.map((category) => (
            <option
              key={category.CategoryID || category.id}
              value={category.CategoryID || category.id}
            >
              {category.name || category.Name}
            </option>
          ))}
        </select>

        <label>Photo</label>

        <input
          id="report-photo"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const files = event.target.files;

            if (files && files.length > 0) {
              setPhoto(files[0]);
            } else {
              setPhoto(null);
            }
          }}
        />

        <div className="location-section">
          <button
            type="button"
            className="secondary-button"
            onClick={getLocation}
            disabled={locationLoading}
          >
            {locationLoading ? "Detecting..." : "Detect My Location"}
          </button>

          {latitude && longitude && (
            <p className="location-text">
              Location: {latitude}, {longitude}
            </p>
          )}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Report"}
        </button>
      </form>
    </div>
  );
}

/* =========================
   MY REPORTS
========================= */

function MyReports({ refreshKey }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReports();
  }, [refreshKey]);

  async function loadReports() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_BASE + "/me/reports", {
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load reports.");
      }

      setReports(data.reports || []);
    } catch (err) {
      setError(err.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }

  function getStatusClass(status) {
    const value = String(status || "").toLowerCase();

    if (value.includes("resolved")) {
      return "status resolved";
    }

    if (value.includes("progress")) {
      return "status progress";
    }

    if (value.includes("acknowledged")) {
      return "status acknowledged";
    }

    return "status reported";
  }

  if (loading) {
    return (
      <div className="panel">
        <h2>My Reports</h2>
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>My Reports</h2>

      {error && <div className="error-box">{error}</div>}

      {reports.length === 0 ? (
        <p>No reports submitted yet.</p>
      ) : (
        <div className="reports-list">
          {reports.map((report) => (
            <div
              className="report-card"
              key={report.ReportID || report.id}
            >
              <div className="report-header">
                <h3>
                  {report.category_name ||
                    report.category ||
                    "Community Issue"}
                </h3>

                <span className={getStatusClass(report.status)}>
                  {report.status || "Reported"}
                </span>
              </div>

              <p>{report.description}</p>

              <small>
                Report ID: {report.ReportID || report.id}
              </small>

              {report.date_submitted && (
                <small>
                  Submitted:{" "}
                  {new Date(report.date_submitted).toLocaleString()}
                </small>
              )}

              {report.photo_url && (
                <img
                  className="report-image"
                  src={
                    report.photo_url.startsWith("http")
                      ? report.photo_url
                      : "http://127.0.0.1:5000" + report.photo_url
                  }
                  alt="Reported issue"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================
   MAIN DASHBOARD
========================= */

function Dashboard({ user, onLogout }) {
  const [refreshKey, setRefreshKey] = useState(0);

  async function logout() {
    try {
      await fetch(API_BASE + "/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (err) {
      console.error(err);
    }

    onLogout();
  }

  return (
    <div className="app">
      <header className="navbar">
        <div>
          <h1>Community Issue Reporting</h1>
          <p>Make your neighbourhood better, one report at a time.</p>
        </div>

        <div className="user-area">
          <span>
            {user?.name || user?.email || "Citizen"}
          </span>

          <button
            type="button"
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard">
        <ReportForm
          user={user}
          onCreated={() => setRefreshKey((value) => value + 1)}
        />

        <MyReports refreshKey={refreshKey} />
      </main>
    </div>
  );
}

/* =========================
   APP
========================= */

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  async function checkAuthentication() {
    try {
      const response = await fetch(API_BASE + "/auth/me", {
        credentials: "include"
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error("Authentication check failed:", err);
    } finally {
      setCheckingAuth(false);
    }
  }

  function handleLogin(result) {
    if (result && result.showRegister) {
      setShowRegister(true);
      return;
    }

    setUser(result);
    setShowRegister(false);
  }

  function handleRegister(result) {
    if (result && result.showLogin) {
      setShowRegister(false);
      return;
    }

    setUser(result);
    setShowRegister(false);
  }

  function handleLogout() {
    setUser(null);
    setShowRegister(false);
  }

  if (checkingAuth) {
    return (
      <div className="loading-page">
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!user) {
    if (showRegister) {
      return <RegisterForm onRegister={handleRegister} />;
    }

    return <LoginForm onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

/* =========================
   START REACT
========================= */

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```
