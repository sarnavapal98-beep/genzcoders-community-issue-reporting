import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";

import App from "./App.jsx";
import { AuthProvider } from "./AuthContext.jsx";

import "./index.css";

// Use HashRouter when running via Live Server (port 5500, 5501, etc.) or static file preview so subpaths and page refreshes work smoothly without server rewrite rules
const isLiveServer =
  typeof window !== "undefined" &&
  (window.location.port === "5500" ||
   window.location.port.startsWith("550") ||
   window.location.port === "8080" ||
   window.location.protocol === "file:");
const Router = isLiveServer ? HashRouter : BrowserRouter;

const basename =
  !isLiveServer && typeof window !== "undefined" && window.location.pathname.startsWith("/genzcoders-community-issue-reporting")
    ? "/genzcoders-community-issue-reporting"
    : "";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <Router basename={basename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
