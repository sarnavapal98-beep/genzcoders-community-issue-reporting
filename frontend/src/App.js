```jsx
import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "./AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ReportIssue from "./pages/Report issue";
import MyReports from "./pages/My reports";
import AdminDashboard from "./pages/Admindashboard";


// ========================================
// Protected Route
// ========================================

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
};


// ========================================
// Admin / Staff Route
// ========================================

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  if (
    user.role !== "admin" &&
    user.role !== "staff"
  ) {
    return (
      <Navigate
        to="/report"
        replace
      />
    );
  }

  return children;
};


// ========================================
// App
// ========================================

const App = () => {
  return (
    <Routes>

      {/* Public Routes */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />


      {/* Citizen Routes */}

      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <ReportIssue />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-reports"
        element={
          <ProtectedRoute>
            <MyReports />
          </ProtectedRoute>
        }
      />


      {/* Admin / Staff Route */}

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />


      {/* Default */}

      <Route
        path="/"
        element={
          <Navigate
            to="/report"
            replace
          />
        }
      />


      {/* Unknown URL */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
};

export default App;
```
