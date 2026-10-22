
import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Home from "./Home.jsx";
import App from "./App.jsx";
import Admin from "./Admin.jsx";
import Auth from "./Auth.jsx";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Home page with Student and Admin login */}
        <Route path="/" element={<Home />} />

        {/* Student complaint portal */}
        <Route path="/student" element={<App />} />

        {/* Admin dashboard */}
        <Route path="/admin" element={<Admin />} />

        {/* Existing authentication pages */}
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />

        {/* Redirect unknown URLs to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
