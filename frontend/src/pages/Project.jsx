import React, { useEffect, useState } from "react";
import API from "../api/api";
import "../style/main.css";
import DataTable from "../components/common/DataTable";
import FormModal from "../components/common/FormModal";
import PageHeader from "../components/common/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../contexts/PermissionContext";

export default function Project() {
    const [projects, setProjects] = useState([]);
    const [staff, setStaff] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [staffSearch, setStaffSearch] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { user } = useAuth();
    const { hasPermission: ctxHasPermission } = usePermissions();

    const isSuperAdmin = user?.email === "gadanipranav@gmail.com" || user?.role?.name === "Super Admin";

    const hasPermission = (module, action = "read") => {
        if (isSuperAdmin) return true;
        return ctxHasPermission(module, action);
    };

    const [form, setForm] = useState({
        name: "",
        description: "",
        assignedTo: [],
        status: "Active",
    });

    const load = async () => {
        try {
            const [p, s] = await Promise.all([
                API.get("/projects"),
                API.get("/staff"),
            ]);
            setProjects(p.data || []);
            setStaff(s.data || []);
        } catch (e) {
            console.log(e);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleStaffToggle = (staffId) => {
        setForm((prev) => {
            const isSelected = prev.assignedTo.includes(staffId);
            return {
                ...prev,
                assignedTo: isSelected
                    ? prev.assignedTo.filter((id) => id !== staffId)
                    : [...prev.assignedTo, staffId],
            };
        });
    };

    const save = async () => {
        try {
            if (editId) {
                await API.put(`/projects/${editId}`, form);
            } else {
                await API.post("/projects", form);
            }

            setShowForm(false);
            setEditId(null);
            setStaffSearch("");
            setIsDropdownOpen(false);
            setForm({
                name: "",
                description: "",
                assignedTo: [],
                status: "Active",
            });
            load();
        } catch (error) {
            console.error(error);
            alert("Error saving project");
        }
    };

    const edit = (item) => {
        setForm({
            name: item.name,
            description: item.description || "",
            assignedTo: item.assignedTo?.map(u => u._id) || [],
            status: item.status || "Active",
        });
        setEditId(item._id);
        setStaffSearch("");
        setIsDropdownOpen(false);
        setShowForm(true);
    };

    const remove = async (id) => {
        if (window.confirm("Delete project?")) {
            await API.delete(`/projects/${id}`);
            load();
        }
    };

    const columns = [
        { header: "Name", key: "name" },
        { header: "Description", key: "description" },
        {
            header: "Assigned To",
            key: "assignedTo",
            render: (v, row) => {
                if (!v || v.length === 0) return <span style={{ color: "#aaa" }}>—</span>;
                return (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {v.map((user) => (
                            <span key={user._id} style={{
                                background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                                color: "white",
                                padding: "6px 14px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "700",
                                display: "inline-block",
                                boxShadow: "2px 2px 5px rgba(67, 56, 202, 0.2)"
                            }}>
                                {user.name}
                            </span>
                        ))}
                    </div>
                );
            },
        },
        {
            header: "Status",
            key: "status",
            render: (v) => (
                <span style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: "800",
                    background: v === "Active" ? "#dcfce7" : "#fee2e2",
                    color: v === "Active" ? "#16a34a" : "#dc2626",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                }}>
                    {v || "Active"}
                </span>
            )
        },
    ];

    return (
        <div className="page">
            <PageHeader
                title="Manage Projects"
                buttonText={hasPermission("project_management", "create") ? "+ Add Project" : null}
                onButtonClick={() => {
                    setForm({ name: "", description: "", assignedTo: [], status: "Active" });
                    setEditId(null);
                    setStaffSearch("");
                    setIsDropdownOpen(false);
                    setShowForm(true);
                }}
            />

            <FormModal
                show={showForm}
                onClose={() => setShowForm(false)}
                title={editId ? "Edit Project" : "Add Project"}
                onSave={save}
                maxWidth="700px"
            >
                <div className="form-group">
                    <label style={{ color: 'var(--text-muted)', marginBottom: '10px', fontSize: '14px', fontWeight: '800', display: 'block' }}>PROJECT NAME</label>
                    <input
                        className="form-control"
                        placeholder="e.g. Website Redesign"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        style={{
                            padding: '14px 18px', border: 'none', borderRadius: '12px',
                            background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-sm)',
                            color: 'var(--text-main)', marginBottom: "20px"
                        }}
                    />
                </div>

                <div className="form-group">
                    <label style={{ color: 'var(--text-muted)', marginBottom: '10px', fontSize: '14px', fontWeight: '800', display: 'block' }}>DESCRIPTION</label>
                    <textarea
                        className="form-control"
                        placeholder="Tell us about the project goal..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        style={{
                            padding: '14px 18px', border: 'none', borderRadius: '12px',
                            background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-sm)',
                            color: 'var(--text-main)', marginBottom: "20px", height: '100px', resize: 'none'
                        }}
                    />
                </div>

                <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label style={{ color: 'var(--text-muted)', marginBottom: '10px', fontSize: '14px', fontWeight: '800', display: 'block' }}>ASSIGN USERS</label>

                    {/* Selected Users Chips */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "15px" }}>
                        {form.assignedTo.length === 0 && <span style={{ fontSize: "14px", color: "#94a3b8", fontStyle: 'italic' }}>No users assigned yet.</span>}
                        {form.assignedTo.map(staffId => {
                            const user = staff.find(s => s._id === staffId);
                            if (!user) return null;
                            return (
                                <span key={staffId} style={{
                                    background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                                    color: "white", padding: "6px 14px", borderRadius: "20px",
                                    fontSize: "12px", fontWeight: "700", display: "inline-flex",
                                    alignItems: "center", gap: "8px", boxShadow: "2px 2px 8px rgba(67, 56, 202, 0.3)"
                                }}>
                                    {user.name}
                                    <span style={{
                                        cursor: "pointer", background: "rgba(255,255,255,0.25)",
                                        borderRadius: "50%", width: "16px", height: "16px",
                                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px"
                                    }} onClick={() => handleStaffToggle(staffId)}>×</span>
                                </span>
                            );
                        })}
                    </div>

                    {/* Search Bar */}
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Type name or role to find staff..."
                            value={staffSearch}
                            onChange={(e) => setStaffSearch(e.target.value)}
                            onFocus={() => setIsDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                            style={{
                                padding: '14px 18px', border: 'none', borderRadius: '12px',
                                background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-sm)',
                                color: 'var(--text-main)', marginBottom: "5px"
                            }}
                        />

                        {/* Custom Search Dropdown */}
                        {isDropdownOpen && (
                            <div style={{
                                position: 'absolute', top: '100%', left: 0, right: 0,
                                maxHeight: "200px", overflowY: "auto",
                                background: "var(--neu-bg)", borderRadius: "12px",
                                boxShadow: "var(--neu-shadow)", zIndex: 100, marginTop: '8px',
                                border: 'none', padding: '10px'
                            }}>
                                {staff
                                    .filter(s => {
                                        const roleStr = (s.position || s.role?.name || "Staff").toLowerCase();
                                        return roleStr.includes("staff") || roleStr.includes("manager");
                                    })
                                    .filter(s => !form.assignedTo.includes(s._id))
                                    .filter(s => s.name?.toLowerCase().includes(staffSearch.toLowerCase()) || (s.position || s.role?.name || "Staff").toLowerCase().includes(staffSearch.toLowerCase()))
                                    .map((s) => (
                                        <div
                                            key={s._id}
                                            onClick={() => { handleStaffToggle(s._id); setStaffSearch(""); }}
                                            style={{
                                                padding: "12px 16px", cursor: "pointer", borderRadius: '8px',
                                                marginBottom: '4px', transition: 'all 0.2s',
                                                color: 'var(--text-main)'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.03)"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                        >
                                            <div style={{ fontWeight: '700', fontSize: '14px' }}>{s.name}</div>
                                            <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: '600', textTransform: 'uppercase' }}>
                                                {s.position || s.role?.name || "Staff"}
                                            </div>
                                        </div>
                                    ))}
                                {staff.filter(s => { const roleStr = (s.position || s.role?.name || "Staff").toLowerCase(); return roleStr.includes("staff") || roleStr.includes("manager"); }).filter(s => !form.assignedTo.includes(s._id)).filter(s => s.name?.toLowerCase().includes(staffSearch.toLowerCase()) || (s.position || s.role?.name || "Staff").toLowerCase().includes(staffSearch.toLowerCase())).length === 0 && (
                                    <div style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px", textAlign: 'center' }}>No staff found.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label style={{ color: 'var(--text-muted)', marginBottom: '10px', fontSize: '14px', fontWeight: '800', display: 'block' }}>STATUS</label>
                    <select
                        className="form-control"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        style={{
                            padding: '14px 18px', border: 'none', borderRadius: '12px',
                            background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-sm)',
                            color: 'var(--text-main)', appearance: 'auto'
                        }}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </FormModal>

            <DataTable
                data={projects}
                columns={columns}
                onEdit={hasPermission("project_management", "update") ? edit : null}
                onDelete={hasPermission("project_management", "delete") ? remove : null}
            />
        </div>
    );
}
