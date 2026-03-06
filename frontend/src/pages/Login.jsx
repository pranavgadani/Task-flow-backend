import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import API from "../api/api";
import "../style/login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: setAuthUser } = useAuth();
  // Read ?redirect= param from URL (e.g. /login?redirect=/document)
  const redirectTo = new URLSearchParams(location.search).get("redirect") || "/";

  const [form, setForm] = useState({ email: "" });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const login = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/login", loginForm);

      const user = res.data.user;
      setAuthUser(user);

      const isSuperAdmin =
        user.email === "gadanipranav@gmail.com" || user?.role?.name === "Super Admin";

      // ✅ PRIORITY 1: If came from email link (e.g. ?redirect=/document?view=ID or ?grant=ID)
      if (redirectTo && redirectTo !== "/") {
        navigate(redirectTo);
        return;
      }

      // ✅ PRIORITY 2: Non-superadmin with assigned docs → go to /document
      if (!isSuperAdmin) {
        try {
          const docsRes = await API.get("/documents");
          const allDocs = docsRes.data || [];
          const userId = String(user._id || "");

          const hasAssignedDoc = allDocs.some(doc =>
            doc.assignedTo && doc.assignedTo.some(m => {
              const mId = String(m._id || m || "");
              return mId === userId;
            })
          );

          if (hasAssignedDoc) {
            navigate("/document");
            return;
          }
        } catch (_) { }
      }

      // ✅ PRIORITY 3: Default dashboard
      navigate("/");

    } catch (err) {
      alert("Wrong Email or Password");
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await API.post("/auth/forgot-password", { email: forgotEmail });
      setMessage({ type: "success", text: "Reset link sent to your email!" });
      setTimeout(() => setShowForgot(false), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Login</h2>
        <form className="login-form" onSubmit={login}>
          <div className="form-group">
            <label className="input-label">Email Address</label>
            <input
              className="input-field"
              placeholder="Enter your email"
              type="email"
              required
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="input-label">Password</label>
            <div style={{ position: "relative" }}>
              <input
                className="input-field"
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            <div style={{ textAlign: "right", marginTop: "5px" }}>
              <span
                onClick={() => setShowForgot(true)}
                style={{ color: "#3b82f6", fontSize: "13px", cursor: "pointer", fontWeight: "500" }}
              >
                Forgot Password?
              </span>
            </div>
          </div>

          <button className="submit-button" type="submit">
            Log In
          </button>
        </form>
        <div className="login-footer">
          <p>© 2024 Task Manager. All rights reserved.</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "#fff", padding: "30px", borderRadius: "16px",
            width: "90%", maxWidth: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ marginBottom: "10px", color: "#1e293b" }}>Forgot Password</h3>
            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleForgot}>
              <div className="form-group">
                <label className="input-label">Email Address</label>
                <input
                  className="input-field"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>

              {message && (
                <div style={{
                  padding: "10px", borderRadius: "8px", marginBottom: "15px", fontSize: "13px",
                  background: message.type === "success" ? "#dcfce7" : "#fee2e2",
                  color: message.type === "success" ? "#166534" : "#991b1b"
                }}>
                  {message.text}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0",
                    background: "#fff", cursor: "pointer", fontWeight: "600"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2, padding: "12px", borderRadius: "8px", border: "none",
                    background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: "600",
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}