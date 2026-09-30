import React, { createContext, useContext, useEffect, useState } from "react";
import {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
} from "./api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("community_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  /*
   * Check whether the user already has an active
   * Flask session when React starts.
   */
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await getCurrentUser();

      if (response.data && response.data.user) {
        setUser(response.data.user);
        try {
          localStorage.setItem("community_user", JSON.stringify(response.data.user));
        } catch (e) {}
      } else {
        setUser(null);
        localStorage.removeItem("community_user");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null);
        localStorage.removeItem("community_user");
      }
      // If it's a network error or offline, keep existing state so user is not locked out
    } finally {
      setLoading(false);
    }
  };

  /*
   * Login
   */
  const login = async (email, password) => {
    try {
      const response = await loginUser({
        email,
        password,
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Login failed");
      }

      if (!data.user) {
        throw new Error("Login successful but user information was not returned");
      }

      setUser(data.user);
      try {
        localStorage.setItem("community_user", JSON.stringify(data.user));
      } catch (e) {}

      return {
        success: true,
        user: data.user,
        message: data.message || "Login successful",
      };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to login";

      throw new Error(message);
    }
  };

  /*
   * Register
   */
  const register = async (userData) => {
    try {
      const response = await registerUser(userData);

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Registration failed");
      }

      /*
       * Some backends automatically log the user in
       * after registration. If user information is returned,
       * store it.
       */
      if (data.user) {
        setUser(data.user);
        try {
          localStorage.setItem("community_user", JSON.stringify(data.user));
        } catch (e) {}
      }

      return {
        success: true,
        user: data.user || null,
        message: data.message || "Registration successful",
      };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Unable to register";

      throw new Error(message);
    }
  };

  /*
   * Logout
   */
  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      /*
       * Even if the backend logout request fails,
       * remove the frontend session.
       */
    } finally {
      localStorage.removeItem("community_user");
      setUser(null);
    }
  };

  /*
   * Context values available to all components.
   */
  const value = {
    user,
    setUser,
    loading,
    login,
    register,
    logout,
    isAuthenticated: Boolean(user),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/*
 * Custom hook:
 *
 * const { user, login, logout } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
};

export default AuthContext;