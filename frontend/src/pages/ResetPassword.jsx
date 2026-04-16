import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../api/api";
import "../style/login.css";

export default function ResetPassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const token = new URLSearchParams(location.search).get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleReset = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            return setError("Passwords do not match");
        }

        const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!strongPassword.test(password)) {
            return setError("Password must be 8+ chars with uppercase, lowercase, number, and symbol.");
        }

        setLoading(true);
        try {
            await API.post("/auth/reset-password", { token, password });
            setSuccess(true);
            setTimeout(() => navigate("/login"), 3000);
        } catch (err) {
            setError(err.response?.data?.error || "Reset failed. Link may be expired.");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="login-page">
                <div className="login-card" style={{ textAlign: "center" }}>
                    <h2 style={{ color: "#ef4444" }}>Invalid Request</h2>
                    <p style={{ color: "#64748b" }}>Missing reset token.</p>
                    <button onClick={() => navigate("/login")} className="submit-button" style={{ marginTop: "20px" }}>
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <h2>Reset Password</h2>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px", textAlign: "center" }}>
                    Create a new secure password for your account.
                </p>

                {success ? (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "40px", marginBottom: "10px" }}>✅</div>
                        <h3 style={{ color: "#16a34a" }}>Success!</h3>
                        <p style={{ color: "#64748b" }}>Your password has been reset. Redirecting to login page...</p>
                        <button onClick={() => navigate("/login")} className="submit-button" style={{ marginTop: "15px" }}>
                            Go to Login
                        </button>
                    </div>
                ) : (
                    <form className="login-form" onSubmit={handleReset}>
                        <div className="form-group">
                            <label className="input-label">New Password</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    className="input-field"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="8+ characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ paddingRight: "45px" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: "absolute", right: "12px", top: "50%",
                                        transform: "translateY(-50%)", cursor: "pointer",
                                        display: "flex", alignItems: "center", color: "#64748b",
                                        background: "transparent", border: "none"
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
                        </div>

                        <div className="form-group">
                            <label className="input-label">Confirm New Password</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    className="input-field"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    placeholder="Repeat password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={{ paddingRight: "45px" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={{
                                        position: "absolute", right: "12px", top: "50%",
                                        transform: "translateY(-50%)", cursor: "pointer",
                                        display: "flex", alignItems: "center", color: "#64748b",
                                        background: "transparent", border: "none"
                                    }}
                                >
                                    {showConfirmPassword ? (
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
                        </div>

                        {error && (
                            <div style={{
                                padding: "12px", borderRadius: "8px", background: "#fee2e2",
                                color: "#991b1b", fontSize: "13px", border: "1px solid #fecaca"
                            }}>
                                {error}
                            </div>
                        )}

                        <button className="submit-button" type="submit" disabled={loading}>
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
