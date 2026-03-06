import React, { useEffect, useState } from "react";
import API from "../api/api";
import { useProject } from "../contexts/ProjectContext";
import "../style/main.css";

export default function Team() {
    const { selectedProject } = useProject();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchTeam = async () => {
            setLoading(true);
            try {
                if (selectedProject && selectedProject.assignedTo && selectedProject.assignedTo.length > 0) {
                    // Fetch full staff list and filter by project's assignedTo
                    const res = await API.get("/staff");
                    const allStaff = res.data || [];
                    const assignedIds = selectedProject.assignedTo.map(u => u._id || u);
                    const filtered = allStaff.filter(s => assignedIds.includes(s._id));
                    setMembers(filtered);
                } else if (!selectedProject) {
                    // No project selected — show all staff
                    const res = await API.get("/staff");
                    setMembers(res.data || []);
                } else {
                    setMembers([]);
                }
            } catch (e) {
                console.error(e);
                setMembers([]);
            }
            setLoading(false);
        };

        fetchTeam();
    }, [selectedProject]);

    const getInitials = (name = "") =>
        name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    const getRoleColor = (position, roleName) => {
        const str = (position || roleName || "").toLowerCase();
        if (str.includes("manager")) return { bg: "#e0f2fe", color: "#0369a1", label: "Manager" };
        if (str.includes("admin")) return { bg: "#fce7f3", color: "#be185d", label: "Admin" };
        return { bg: "#dcfce7", color: "#15803d", label: "Staff" };
    };

    const filteredMembers = members.filter(m =>
        m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page" style={{ padding: '0 10px' }}>

            {/* Header */}
            <div style={{
                marginBottom: "40px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "24px",
                background: 'var(--neu-bg)',
                padding: '24px 32px',
                borderRadius: '20px',
                boxShadow: 'var(--neu-shadow-sm)'
            }}>
                <div>
                    <h1 style={{
                        fontSize: "26px",
                        fontWeight: "900",
                        color: "var(--text-main)",
                        margin: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        letterSpacing: '-0.5px'
                    }}>
                        <div style={{
                            background: 'var(--neu-bg)',
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--neu-shadow-inner)'
                        }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        </div>
                        Team Members
                    </h1>
                    <p style={{ color: "var(--text-muted)", marginTop: "8px", fontSize: "13.5px", fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {selectedProject
                            ? <>Project Team <span style={{ color: "var(--primary-color)", margin: '0 4px' }}>/</span> <strong>{selectedProject.name}</strong></>
                            : "Direct Organization Staff"}
                    </p>
                </div>

                {/* Search Bar */}
                <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
                    <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-light)", display: "flex" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /></svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "16px 16px 16px 48px",
                            borderRadius: "14px",
                            border: "none",
                            background: 'var(--neu-bg)',
                            boxShadow: 'var(--neu-shadow-sm)',
                            fontSize: "14px",
                            fontWeight: '600',
                            color: 'var(--text-main)',
                            outline: "none",
                            transition: "all 0.3s ease"
                        }}
                        onFocus={(e) => {
                            e.target.style.boxShadow = 'var(--neu-shadow-inner)';
                        }}
                        onBlur={(e) => {
                            e.target.style.boxShadow = 'var(--neu-shadow-sm)';
                        }}
                    />
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div style={{ textAlign: "center", padding: "80px", color: "var(--text-light)", fontWeight: '700', fontSize: '18px' }}>
                    Fetching Team Data...
                </div>
            )}

            {/* Empty */}
            {!loading && filteredMembers.length === 0 && (
                <div style={{
                    textAlign: "center", padding: "80px", color: "var(--text-muted)",
                    background: "var(--neu-bg)", borderRadius: "24px", boxShadow: 'var(--neu-shadow-sm)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                    <div style={{
                        marginBottom: "24px",
                        width: '80px', height: '80px',
                        background: 'var(--neu-bg)',
                        borderRadius: '20px',
                        display: 'flex', alignItems: "center", justifyContent: "center",
                        boxShadow: 'var(--neu-shadow-inner)',
                        color: "var(--text-light)"
                    }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </div>
                    <p style={{ fontSize: "18px", fontWeight: '800', color: 'var(--text-main)' }}>
                        {search
                            ? `No members found matching "${search}"`
                            : (selectedProject ? `No team members assigned to "${selectedProject.name}" yet.` : "No staff members found.")
                        }
                    </p>
                </div>
            )}

            {/* Cards Grid */}
            {!loading && filteredMembers.length > 0 && (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "30px",
                }}>
                    {filteredMembers.map(member => {
                        const role = getRoleColor(member.position, member.role?.name);
                        return (
                            <div
                                key={member._id}
                                style={{
                                    background: "var(--neu-bg)",
                                    borderRadius: "24px",
                                    padding: "32px 24px",
                                    boxShadow: "var(--neu-shadow)",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "20px",
                                    transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                    cursor: "pointer",
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = "translateY(-8px)";
                                    e.currentTarget.style.boxShadow = "var(--neu-shadow-hover)";
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "var(--neu-shadow)";
                                }}
                            >
                                {/* Avatar Section */}
                                <div style={{ position: 'relative' }}>
                                    {member.image ? (
                                        <img
                                            src={`http://localhost:5000/uploads/${member.image}`}
                                            alt={member.name}
                                            style={{
                                                width: "90px", height: "90px", borderRadius: "50%",
                                                objectFit: "cover",
                                                border: "4px solid var(--neu-bg)",
                                                boxShadow: 'var(--neu-shadow-sm)'
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: "90px", height: "90px", borderRadius: "50%",
                                            background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                                            color: "#fff", display: "flex", alignItems: "center",
                                            justifyContent: "center", fontSize: "28px", fontWeight: "900",
                                            border: "4px solid var(--neu-bg)", flexShrink: 0,
                                            boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
                                        }}>
                                            {getInitials(member.name)}
                                        </div>
                                    )}
                                    {/* Status Indicator */}
                                    <div style={{
                                        position: 'absolute', bottom: '2px', right: '5px',
                                        width: '18px', height: '18px', borderRadius: '50%',
                                        background: member.status === "Active" ? "#22c55e" : "#ef4444",
                                        border: '3px solid var(--neu-bg)',
                                        boxShadow: 'var(--neu-shadow-sm)'
                                    }}></div>
                                </div>

                                {/* Name & Role */}
                                <div style={{ textAlign: "center", width: '100%' }}>
                                    <h3 style={{ fontWeight: "900", fontSize: "18px", color: "var(--text-main)", margin: '0 0 8px 0', letterSpacing: '-0.2px' }}>
                                        {member.name}
                                    </h3>

                                    <span style={{
                                        display: "inline-block",
                                        padding: "4px 14px", borderRadius: "999px",
                                        background: role.bg, color: role.color,
                                        fontSize: "11px", fontWeight: "800",
                                        textTransform: 'uppercase', letterSpacing: '0.5px',
                                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                                    }}>
                                        {member.position || member.role?.name || role.label}
                                    </span>
                                </div>

                                {/* Contact Details */}
                                <div style={{
                                    width: "100%",
                                    background: 'var(--neu-bg)',
                                    padding: '16px',
                                    borderRadius: '16px',
                                    display: "flex", flexDirection: "column", gap: "10px",
                                    boxShadow: 'var(--neu-shadow-inner)'
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "var(--text-muted)", fontWeight: '600' }}>
                                        <div style={{
                                            padding: '6px', borderRadius: '8px', background: 'var(--neu-bg)',
                                            boxShadow: 'var(--neu-shadow-sm)', display: 'flex'
                                        }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                        </div>
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {member.email}
                                        </span>
                                    </div>
                                    {member.phone && (
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: "var(--text-muted)", fontWeight: '600' }}>
                                            <div style={{
                                                padding: '6px', borderRadius: '8px', background: 'var(--neu-bg)',
                                                boxShadow: 'var(--neu-shadow-sm)', display: 'flex'
                                            }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>
                                            </div>
                                            <span>{member.phone}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Status Toggle/Quick Action */}
                                <div style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: '900',
                                    textAlign: 'center',
                                    background: member.status === "Active" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                    color: member.status === "Active" ? "#166534" : "#991b1b",
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>
                                    {member.status || "Active"}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
