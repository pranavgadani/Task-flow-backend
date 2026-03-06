import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import API from "../api/api";
import { useProject } from "../contexts/ProjectContext";
import FormModal from "../components/common/FormModal";
import PageHeader from "../components/common/PageHeader";
import DataTable from "../components/common/DataTable";
import "../style/main.css";


const BASE_URL = "http://localhost:5000/uploads/";
const SUPERADMIN_EMAIL = "gadanipranav@gmail.com";

export default function Document() {
    const { selectedProject } = useProject();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isSuperAdmin = user?.email === SUPERADMIN_EMAIL || user?.role?.name === "Super Admin";
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const viewDocId = params.get("view");
    const grantDocId = params.get("grant"); // superadmin clicks from email

    const [documents, setDocuments] = useState([]);
    const [projectMembers, setProjectMembers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [memberSearch, setMemberSearch] = useState("");
    const [viewFile, setViewFile] = useState(null);
    const [projects, setProjects] = useState([]);

    // Mention system state for description
    const [mentionQuery, setMentionQuery] = useState(null);
    const [cursorPos, setCursorPos] = useState(0);
    const [grantPopup, setGrantPopup] = useState(null); // { doc } for superadmin grant confirmation
    const [requestingDocId, setRequestingDocId] = useState(null); // loading state
    const [toast, setToast] = useState(null);

    const [form, setForm] = useState({
        documentType: "",
        description: "",
        access: "All",
        assignedTo: [],
        project: "",
        file: null,
        oldFile: "",
        accessGranted: false,
    });

    // ================= TOAST =================
    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ================= LOAD =================
    const load = async () => {
        try {
            const url = selectedProject
                ? `/documents?project=${selectedProject._id}`
                : "/documents";
            const res = await API.get(url);
            const docs = res.data || [];
            setDocuments(docs);

            // ✅ Auto-open if ?view=DOC_ID (came from email link after login)
            if (viewDocId) {
                const target = docs.find(d => d._id === viewDocId);
                if (target) {
                    if (target.accessGranted && target.file) {
                        setViewFile({ url: `${BASE_URL}${target.file}`, name: target.file });
                    } else if (!target.accessGranted) {
                        showToast("Access not yet granted. Please request access.", "warn");
                    }
                }
            }

            // ✅ If superadmin clicked "Grant Access" link from email → open grant popup
            if (grantDocId && isSuperAdmin) {
                const target = docs.find(d => d._id === grantDocId);
                if (target && !target.accessGranted) {
                    setGrantPopup({ doc: target });
                    // Clean URL to avoid re-opening
                    navigate("/document", { replace: true });
                }
            }

            // Load projects for selection
            const projRes = await API.get("/projects");
            setProjects(projRes.data || []);

            // Load project members (for form)
            if (selectedProject && selectedProject.assignedTo) {
                const staffRes = await API.get("/staff");
                const allStaff = staffRes.data || [];
                const assignedIds = selectedProject.assignedTo.map(u => u._id || u);
                setProjectMembers(allStaff.filter(s => assignedIds.includes(s._id)));
            } else {
                const staffRes = await API.get("/staff");
                setProjectMembers(staffRes.data || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => { load(); }, [selectedProject]);

    // ================= RESET FORM =================
    const resetForm = () => {
        setMemberSearch("");
        setForm({
            documentType: "Document",
            description: "",
            access: "All",
            assignedTo: [],
            project: selectedProject?._id || "",
            file: null,
            oldFile: "",
            accessGranted: false,
        });
        setEditId(null);
    };

    // ================= SAVE =================
    const save = async () => {

        const fd = new FormData();
        fd.append("documentType", form.documentType);
        fd.append("description", form.description || "");
        fd.append("access", form.access || "All");
        fd.append("project", form.project || selectedProject?._id || "");
        form.assignedTo.forEach(id => fd.append("assignedTo", id));
        if (form.file) fd.append("file", form.file);
        fd.append("accessGranted", form.accessGranted);

        try {
            if (editId) {
                await API.put(`/documents/${editId}`, fd);
            } else {
                await API.post("/documents", fd);
            }
            setShowForm(false);
            resetForm();
            load();
            showToast(editId ? "Document updated!" : "Document added & email sent to assigned users!");
        } catch (err) {
            alert("Error saving: " + (err.response?.data?.error || err.message));
        }
    };

    // ================= EDIT =================
    const edit = (doc) => {
        setForm({
            documentType: doc.documentType || "",
            description: doc.description || "",
            access: doc.access || "All",
            assignedTo: (doc.assignedTo || []).map(u => u._id || u),
            project: doc.project?._id || doc.project || "",
            file: null,
            oldFile: doc.file || "",
            accessGranted: doc.accessGranted || false,
        });
        setEditId(doc._id);
        setShowForm(true);
    };

    // ================= DELETE =================
    const remove = async (id) => {
        if (window.confirm("Delete this document?")) {
            await API.delete(`/documents/${id}`);
            load();
            showToast("Document deleted.");
        }
    };

    // ================= MEMBER TOGGLE =================
    const toggleMember = (id) => {
        setForm(prev => ({
            ...prev,
            assignedTo: prev.assignedTo.includes(id)
                ? prev.assignedTo.filter(m => m !== id)
                : [...prev.assignedTo, id],
        }));
    };

    // ================= FILE ICON =================
    const getFileIcon = (filename) => {
        const defaultIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>;
        if (!filename) return defaultIcon;
        const ext = filename.split(".").pop().toLowerCase();
        if (["pdf"].includes(ext)) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M8 13h2a2 2 0 1 0 0-4H8v8" /><path d="M14 17h-2v-8h2a2 2 0 1 1 0 4h-2" /></svg>;
        if (["doc", "docx"].includes(ext)) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>;
        if (["xls", "xlsx", "csv"].includes(ext)) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M8 13h8M8 17h8M8 9h2" /></svg>;
        if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>;
        if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="4" rx="2" /><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" /><path d="M10 13h4" /></svg>;
        return defaultIcon;
    };

    // ================= REQUEST ACCESS (assigned user) =================
    const requestAccess = async (docId) => {
        setRequestingDocId(docId);
        try {
            await API.post(`/documents/${docId}/request-access`);
            showToast("Access request sent to admin! You will be notified.");
            // Update local state
            setDocuments(prev => prev.map(d =>
                d._id === docId ? { ...d, accessRequested: true } : d
            ));
        } catch (e) {
            showToast(e.response?.data?.error || "Failed to send request.", "error");
        } finally {
            setRequestingDocId(null);
        }
    };

    // ================= GRANT ACCESS (superadmin from popup) =================
    const grantAccess = async (docId) => {
        try {
            const res = await API.patch(`/documents/${docId}/access`);
            setDocuments(prev => prev.map(d => d._id === docId ? res.data : d));
            setGrantPopup(null);
            showToast("✅ Access granted successfully!");
        } catch (e) {
            showToast(e.response?.data?.error || "Failed to grant access.", "error");
        }
    };

    // ================= REVOKE ACCESS (superadmin) =================
    const revokeAccess = async (docId) => {
        try {
            const res = await API.patch(`/documents/${docId}/revoke-access`);
            setDocuments(prev => prev.map(d => d._id === docId ? res.data : d));
            showToast("Access revoked.");
        } catch (e) {
            showToast(e.response?.data?.error || "Failed to revoke access.", "error");
        }
    };

    // ================= FORCE DOWNLOAD =================
    const handleDownload = async (url, filename) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename || "document";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
            alert("Download failed: " + e.message);
        }
    };

    // ================= MENTIONS LOGIC =================
    const handleDescriptionChange = (e) => {
        const val = e.target.value;
        setForm({ ...form, description: val });
        const cursor = e.target.selectionStart;

        const textBeforeCursor = val.slice(0, cursor);
        const words = textBeforeCursor.split(/\s/);
        const currentWord = words[words.length - 1];

        if (currentWord.startsWith("@")) {
            setMentionQuery(currentWord.slice(1).toLowerCase());
            setCursorPos(cursor);
        } else {
            setMentionQuery(null);
        }
    };

    const handleMentionSelect = (memberName) => {
        const val = form.description || "";
        const textBeforeCursor = val.slice(0, cursorPos);
        const textAfterCursor = val.slice(cursorPos);

        const lastAtIndex = textBeforeCursor.lastIndexOf("@");
        if (lastAtIndex !== -1) {
            const newText = val.slice(0, lastAtIndex) + "@" + memberName + " " + textAfterCursor;
            setForm({ ...form, description: newText });
        }
        setMentionQuery(null);
    };

    // ================= PENDING REQUESTS (for superadmin) =================
    const pendingRequests = isSuperAdmin
        ? documents.filter(d => d.accessRequested && !d.accessGranted)
        : [];

    return (
        <div className="page">
            {/* ===== TOAST ===== */}
            {toast && (
                <div style={{
                    position: "fixed", top: "20px", right: "24px", zIndex: 10000,
                    padding: "14px 22px", borderRadius: "10px", fontSize: "14px",
                    fontWeight: "600", color: "#fff", boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
                    background: toast.type === "error" ? "#ef4444"
                        : toast.type === "warn" ? "#f59e0b" : "#16a34a",
                    animation: "fadeInDown 0.3s ease",
                }}>
                    {toast.msg}
                </div>
            )}

            <PageHeader
                title={selectedProject ? `${selectedProject.name} — Documents` : "All Documents"}
                buttonText={isSuperAdmin ? "+ Upload Document" : null}
                onButtonClick={isSuperAdmin ? () => { resetForm(); setShowForm(true); } : null}
            />

            {/* ===== SUPERADMIN: PENDING ACCESS REQUESTS BANNER ===== */}
            {isSuperAdmin && pendingRequests.length > 0 && (
                <div style={{
                    background: "linear-gradient(135deg, #fefce8, #fef3c7)",
                    border: "1.5px solid #fbbf24",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    marginBottom: "20px",
                    boxShadow: "0 2px 10px rgba(251,191,36,0.15)",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        <span style={{ fontSize: "20px" }}>🔔</span>
                        <span style={{ fontWeight: "700", fontSize: "15px", color: "#92400e" }}>
                            Pending Access Requests ({pendingRequests.length})
                        </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {pendingRequests.map(doc => (
                            <div key={doc._id} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                background: "#fff", borderRadius: "8px", padding: "10px 16px",
                                border: "1px solid #fde68a",
                            }}>
                                <div>
                                    <span style={{ fontWeight: "600", fontSize: "14px", color: "#1e293b" }}>
                                        {doc.description || doc.documentType || "Document"}
                                    </span>
                                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                                        Requested by: {doc.assignedTo?.map(m => m.name).join(", ") || "—"}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setGrantPopup({ doc })}
                                    style={{
                                        padding: "7px 18px",
                                        background: "linear-gradient(135deg, #16a34a, #15803d)",
                                        color: "#fff", border: "none", borderRadius: "8px",
                                        cursor: "pointer", fontSize: "13px", fontWeight: "700",
                                        boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
                                    }}
                                >
                                    ✅ Grant Access
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== GRANT ACCESS POPUP (superadmin) ===== */}
            {grantPopup && (
                <div
                    onClick={() => setGrantPopup(null)}
                    style={{
                        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
                        zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: "#fff", borderRadius: "16px", padding: "32px 36px",
                            maxWidth: "440px", width: "90%",
                            boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
                            textAlign: "center",
                        }}
                    >
                        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔐</div>
                        <h2 style={{ margin: "0 0 8px", color: "#1e293b", fontSize: "20px" }}>
                            Grant Document Access
                        </h2>
                        <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px" }}>
                            Do you want to grant access to:
                        </p>
                        <div style={{
                            background: "#f8fafc", borderRadius: "10px", padding: "14px 18px",
                            border: "1px solid #e5e7eb", textAlign: "left", marginBottom: "24px",
                        }}>
                            <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "14px" }}>
                                📄 {grantPopup.doc?.description || grantPopup.doc?.documentType || "Document"}
                            </div>
                            <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "6px" }}>
                                <strong>Assigned to:</strong>{" "}
                                {grantPopup.doc?.assignedTo?.map(m => m.name).join(", ") || "—"}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                            <button
                                onClick={() => setGrantPopup(null)}
                                style={{
                                    padding: "10px 24px", background: "#f3f4f6",
                                    color: "#374151", border: "none", borderRadius: "8px",
                                    cursor: "pointer", fontSize: "14px", fontWeight: "600",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => grantAccess(grantPopup.doc._id)}
                                style={{
                                    padding: "10px 24px",
                                    background: "linear-gradient(135deg, #16a34a, #15803d)",
                                    color: "#fff", border: "none", borderRadius: "8px",
                                    cursor: "pointer", fontSize: "14px", fontWeight: "700",
                                    boxShadow: "0 4px 12px rgba(22,163,74,0.3)",
                                }}
                            >
                                ✅ Yes, Grant Access
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= FORM MODAL ================= */}
            <FormModal
                show={showForm}
                onClose={() => { setShowForm(false); resetForm(); }}
                title={editId ? "Edit Document" : "Add Document"}
                onSave={save}
            >
                <div style={{ position: "relative", marginBottom: "15px" }}>
                    <label style={labelStyle}>Description</label>
                    <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Enter document description (type @ to mention a member)..."
                        value={form.description}
                        onChange={handleDescriptionChange}
                    />
                    {mentionQuery !== null && (
                        <div style={{
                            position: "absolute",
                            top: "100%", left: 0,
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            borderRadius: "8px",
                            zIndex: 10,
                            width: "250px",
                            maxHeight: "150px",
                            overflowY: "auto",
                            marginTop: "4px"
                        }}>
                            {projectMembers
                                .filter(s => s.name?.toLowerCase().includes(mentionQuery))
                                .map(s => (
                                    <div
                                        key={s._id}
                                        onClick={() => handleMentionSelect(s.name)}
                                        style={{
                                            padding: "8px 12px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            borderBottom: "1px solid #f1f5f9",
                                            transition: "background 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                                    >
                                        <span style={{ fontWeight: "600", color: "#1e293b" }}>{s.name}</span>
                                        <span style={{ color: "#94a3b8", marginLeft: "6px", fontSize: "11px" }}>
                                            ({s.position || s.role?.name || "Staff"})
                                        </span>
                                    </div>
                                ))}
                            {projectMembers.filter(s => s.name?.toLowerCase().includes(mentionQuery)).length === 0 && (
                                <div style={{ padding: "8px 12px", fontSize: "12px", color: "#94a3b8" }}>No members found</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Grant Access Toggle (Superadmin only) */}
                {isSuperAdmin && (
                    <div style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                            type="checkbox"
                            id="accessGranted"
                            checked={form.accessGranted}
                            onChange={e => setForm({ ...form, accessGranted: e.target.checked })}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        <label htmlFor="accessGranted" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>
                            Grant Instant Access to Assigned Users
                        </label>
                    </div>
                )}

                {/* Upload File */}
                <div style={{ marginBottom: "15px" }}>
                    <label style={labelStyle}>Upload Document</label>
                    <input
                        type="file"
                        className="form-control"
                        onChange={e => setForm({ ...form, file: e.target.files[0] })}
                    />
                </div>

                {/* Project Selection */}
                <div style={{ marginBottom: "15px" }}>
                    <label style={labelStyle}>Link to Project</label>
                    <select
                        className="form-control"
                        value={form.project}
                        onChange={e => setForm({ ...form, project: e.target.value })}
                    >
                        <option value="">No Project (Global)</option>
                        {projects.map(p => (
                            <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                {form.oldFile && !form.file && (
                    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>{getFileIcon(form.oldFile)}</span>
                        <a
                            href={`${BASE_URL}${form.oldFile}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#3b82f6", fontSize: "13px" }}
                        >
                            {form.oldFile}
                        </a>
                        <span style={{ color: "#9ca3af", fontSize: "12px" }}>(current file)</span>
                    </div>
                )}

                {/* Assign Members */}
                <div style={{ marginBottom: "15px" }}>
                    <label style={labelStyle}>
                        Assign Members
                        {selectedProject ? ` (${selectedProject.name} team)` : ""}
                    </label>
                    {projectMembers.length === 0 ? (
                        <p style={{ color: "#9ca3af", fontSize: "13px" }}>
                            {selectedProject ? "No members assigned to this project." : "Select a project to see members."}
                        </p>
                    ) : (
                        <div>
                            <div style={{ position: "relative", marginBottom: "8px" }}>
                                <span style={{
                                    position: "absolute", left: "10px", top: "50%",
                                    transform: "translateY(-50%)", color: "#9ca3af", display: "flex"
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /></svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search member..."
                                    value={memberSearch}
                                    onChange={e => setMemberSearch(e.target.value)}
                                    style={{
                                        width: "100%", padding: "8px 10px 8px 32px",
                                        border: "1px solid #e5e7eb", borderRadius: "8px",
                                        fontSize: "13px", outline: "none",
                                        background: "#f9fafb", boxSizing: "border-box",
                                    }}
                                />
                            </div>
                            <div style={{
                                border: "1px solid #e5e7eb", borderRadius: "8px",
                                maxHeight: "160px", overflowY: "auto", padding: "8px"
                            }}>
                                {projectMembers
                                    .filter(m => m.name?.toLowerCase().includes(memberSearch.toLowerCase()))
                                    .map(m => {
                                        const selected = form.assignedTo.includes(m._id);
                                        return (
                                            <div
                                                key={m._id}
                                                onClick={() => toggleMember(m._id)}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: "10px",
                                                    padding: "8px 10px", cursor: "pointer", borderRadius: "8px",
                                                    marginBottom: "4px",
                                                    background: selected ? "#eff6ff" : "#f9fafb",
                                                    border: selected ? "1.5px solid #93c5fd" : "1.5px solid transparent",
                                                    transition: "all 0.15s",
                                                }}
                                            >
                                                <div style={{
                                                    width: "32px", height: "32px", borderRadius: "50%",
                                                    background: selected
                                                        ? "linear-gradient(135deg,#3b82f6,#6366f1)"
                                                        : "linear-gradient(135deg,#9ca3af,#6b7280)",
                                                    color: "#fff", display: "flex", alignItems: "center",
                                                    justifyContent: "center", fontSize: "13px", fontWeight: "700",
                                                    flexShrink: 0,
                                                }}>
                                                    {m.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: selected ? "#1d4ed8" : "#1e293b" }}>
                                                        {m.name}
                                                    </p>
                                                    <p style={{ margin: 0, fontSize: "11px", color: "#6b7280" }}>
                                                        {m.position || m.role?.name || "Staff"}
                                                    </p>
                                                </div>
                                                {selected && (
                                                    <span style={{
                                                        width: "20px", height: "20px", borderRadius: "50%",
                                                        background: "#3b82f6", color: "#fff",
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        fontSize: "11px", fontWeight: "700", flexShrink: 0,
                                                    }}>✓</span>
                                                )}
                                            </div>
                                        );
                                    })
                                }
                                {projectMembers.filter(m => m.name?.toLowerCase().includes(memberSearch.toLowerCase())).length === 0 && (
                                    <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "13px", margin: "10px 0" }}>
                                        No members found
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </FormModal>

            {/* ================= TABLE ================= */}
            <div style={{ marginTop: "20px" }}>
                <DataTable
                    data={documents}
                    emptyText={selectedProject ? `No documents for "${selectedProject.name}"` : "No documents found"}
                    columns={[
                        {
                            header: "Description",
                            key: "description",
                            render: (val) => (
                                <div style={{ color: "var(--text-muted)", fontWeight: "600", maxWidth: "250px" }}>
                                    {val || "—"}
                                </div>
                            )
                        },
                        {
                            header: "Project",
                            key: "project",
                            render: (p) => p ? (
                                <span style={{
                                    padding: "4px 10px", borderRadius: "8px", fontSize: "11px",
                                    fontWeight: "700", background: "var(--neu-bg)",
                                    boxShadow: "var(--neu-shadow-sm)", color: "var(--primary-color)"
                                }}>
                                    {p.name}
                                </span>
                            ) : <span style={{ color: "#aaa" }}>Global</span>
                        },
                        {
                            header: "File",
                            key: "file",
                            align: "center",
                            render: (val, doc) => val ? (
                                (isSuperAdmin || doc.accessGranted) ? (
                                    <button
                                        onClick={() => setViewFile({ url: `${BASE_URL}${val}`, name: val })}
                                        className="btn btn-secondary"
                                        style={{
                                            display: "inline-flex", alignItems: "center", gap: "10px",
                                            padding: "8px 18px", fontSize: "12px", fontWeight: "800",
                                            boxShadow: "var(--neu-shadow-sm)", height: 'auto',
                                            borderRadius: '12px'
                                        }}
                                    >
                                        <span>{getFileIcon(val)}</span> VIEW
                                    </button>
                                ) : (
                                    <span style={{
                                        color: "var(--text-light)", fontSize: "11px", fontWeight: "800",
                                        textTransform: "uppercase", letterSpacing: "1px",
                                        display: "inline-flex", alignItems: "center", gap: "6px",
                                        justifyContent: "center", width: "100%"
                                    }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                        Locked
                                    </span>
                                )
                            ) : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>No file</span>
                        },
                        {
                            header: "Assigned To",
                            key: "assignedTo",
                            align: "center",
                            render: (members) => (
                                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "center" }}>
                                    {members?.map(m => (
                                        <span
                                            key={m._id}
                                            title={m.name}
                                            style={{
                                                width: "28px", height: "28px", borderRadius: "50%",
                                                background: "linear-gradient(135deg,#6366f1,#3b82f6)",
                                                color: "#fff", display: "flex", alignItems: "center",
                                                justifyContent: "center", fontSize: "11px", fontWeight: "700",
                                            }}
                                        >
                                            {m.name?.charAt(0).toUpperCase()}
                                        </span>
                                    ))}
                                    {(!members || members.length === 0) && "—"}
                                </div>
                            )
                        },
                        {
                            header: "Access Status",
                            key: "accessGranted",
                            align: "center",
                            render: (granted, doc) => (
                                granted ? (
                                    <span style={{
                                        padding: "8px 16px", borderRadius: "10px", fontSize: "11px", fontWeight: "800",
                                        background: "#dcfce7", color: "#16a34a", textTransform: "uppercase", letterSpacing: "1px",
                                        minWidth: "110px", display: "inline-flex", justifyContent: "center",
                                        boxShadow: "var(--neu-shadow-sm)", border: "1px solid rgba(22, 163, 74, 0.2)"
                                    }}>
                                        Granted
                                    </span>
                                ) : doc.accessRequested ? (
                                    <span style={{
                                        padding: "8px 16px", borderRadius: "10px", fontSize: "11px", fontWeight: "800",
                                        background: "#fef3c7", color: "#d97706", textTransform: "uppercase", letterSpacing: "1px",
                                        minWidth: "110px", display: "inline-flex", justifyContent: "center",
                                        boxShadow: "var(--neu-shadow-sm)", border: "1px solid rgba(217, 119, 6, 0.2)"
                                    }}>
                                        Pending
                                    </span>
                                ) : (
                                    <span style={{
                                        padding: "8px 16px", borderRadius: "10px", fontSize: "11px", fontWeight: "800",
                                        background: "#fee2e2", color: "#dc2626", textTransform: "uppercase", letterSpacing: "1px",
                                        minWidth: "110px", display: "inline-flex", justifyContent: "center",
                                        boxShadow: "var(--neu-shadow-sm)", border: "1px solid rgba(220, 38, 38, 0.2)"
                                    }}>
                                        No Access
                                    </span>
                                )
                            )
                        }
                    ]}
                    renderActions={(doc) => (
                        <div style={{ display: "flex", gap: "10px", justifyContent: 'flex-start' }}>
                            {(isSuperAdmin || doc.accessGranted) && doc.file && (
                                <button
                                    className="btn"
                                    onClick={() => handleDownload(`${BASE_URL}${doc.file}`, doc.file)}
                                    title="Download"
                                    style={{
                                        width: '36px', height: '36px', padding: 0,
                                        borderRadius: '50%', color: 'var(--success-color)',
                                        boxShadow: 'var(--neu-shadow-sm)'
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                </button>
                            )}

                            {isSuperAdmin && (
                                <>
                                    <button
                                        className="btn"
                                        onClick={() => edit(doc)}
                                        title="Edit"
                                        style={{
                                            width: '36px', height: '36px', padding: 0,
                                            borderRadius: '50%', color: 'var(--primary-color)',
                                            boxShadow: 'var(--neu-shadow-sm)'
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                                    </button>
                                    <button
                                        className="btn"
                                        onClick={() => remove(doc._id)}
                                        title="Delete"
                                        style={{
                                            width: '36px', height: '36px', padding: 0,
                                            borderRadius: '50%', color: 'var(--danger-color)',
                                            boxShadow: 'var(--neu-shadow-sm)'
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                    </button>
                                </>
                            )}

                            {!isSuperAdmin && !doc.accessGranted && (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => requestAccess(doc._id)}
                                    disabled={doc.accessRequested || requestingDocId === doc._id}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "12px",
                                        fontSize: "12px",
                                        fontWeight: "800",
                                        boxShadow: doc.accessRequested ? "var(--neu-shadow-inner)" : "var(--neu-shadow-sm)",
                                        height: 'auto'
                                    }}
                                >
                                    {requestingDocId === doc._id ? "..." : doc.accessRequested ? "PENDING" : "REQUEST ACCESS"}
                                </button>
                            )}
                        </div>
                    )}
                />
            </div >

            {/* ================= FILE PREVIEW POPUP ================= */}
            {
                viewFile && (
                    <div
                        onClick={() => setViewFile(null)}
                        style={{
                            position: "fixed", inset: 0,
                            background: "rgba(0,0,0,0.65)",
                            zIndex: 9999,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: "20px",
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: "#fff",
                                borderRadius: "14px",
                                width: "90%", maxWidth: "900px",
                                maxHeight: "90vh",
                                display: "flex", flexDirection: "column",
                                overflow: "hidden",
                                boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "14px 20px",
                                borderBottom: "1px solid #e5e7eb",
                                background: "#f8fafc",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <span style={{ fontSize: "20px" }}>{getFileIcon(viewFile.name)}</span>
                                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b", wordBreak: "break-all" }}>
                                        {viewFile.name}
                                    </span>
                                </div>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <button
                                        onClick={() => setViewFile(null)}
                                        style={{
                                            background: "none", border: "none",
                                            fontSize: "22px", cursor: "pointer",
                                            color: "#6b7280", lineHeight: 1,
                                            padding: "2px 6px",
                                        }}
                                    >✕</button>
                                </div>
                            </div>

                            {/* File Content */}
                            <div style={{ flex: 1, overflow: "auto", background: "#f1f5f9" }}>
                                {(() => {
                                    const ext = viewFile.name.split(".").pop().toLowerCase();
                                    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
                                        return (
                                            <img
                                                src={viewFile.url}
                                                alt="preview"
                                                style={{ display: "block", maxWidth: "100%", margin: "auto", padding: "20px" }}
                                            />
                                        );
                                    }
                                    if (["mp4", "webm", "ogg", "mov"].includes(ext)) {
                                        return (
                                            <video
                                                src={viewFile.url}
                                                controls
                                                style={{ display: "block", maxWidth: "100%", margin: "auto", padding: "20px" }}
                                            />
                                        );
                                    }
                                    if (["mp3", "wav"].includes(ext)) {
                                        return (
                                            <div style={{ padding: "40px", textAlign: "center" }}>
                                                <audio src={viewFile.url} controls style={{ width: "100%" }} />
                                            </div>
                                        );
                                    }
                                    return (
                                        <iframe
                                            src={viewFile.url}
                                            title="document preview"
                                            style={{ width: "100%", height: "75vh", border: "none" }}
                                        />
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// Styles
const labelStyle = {
    fontWeight: "600", display: "block", marginBottom: "6px",
    fontSize: "13px", color: "#374151",
};
const thStyle = {
    padding: "12px 16px", textAlign: "left", fontSize: "12px",
    fontWeight: "700", color: "#6b7280", textTransform: "uppercase",
    letterSpacing: "0.05em",
};
const tdStyle = {
    padding: "12px 16px", fontSize: "13px", color: "#1e293b",
    verticalAlign: "middle",
};
