import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { useCompany } from "../contexts/CompanyContext";
import PageHeader from "../components/common/PageHeader";
import { TextInput, SelectField, FormField } from "../components/common/FormFields";
import SubscriptionView from "../components/SubscriptionView";

export default function Profile() {
    const { user, setUser } = useAuth();
    const { selectedCompany } = useCompany();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "bio");
    const [loading, setLoading] = useState(false);
    const isNewRegistration = searchParams.get("new") === "1";

    const [companyData, setCompanyData] = useState({
        companyName: "",
        email: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        country: "",
        state: "",
        city: "",
        pincode: "",
        gstNumber: "",
        panNumber: "",
        appLogo: "",
        workingHours: { start: "09:00", end: "18:00" },
        breakTime: { start: "13:00", end: "14:00" },
        holidays: []
    });

    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState("");
    const [newHoliday, setNewHoliday] = useState({ date: "", title: "" });

    const isOwnerOrAdmin = user?.role?.name === "Company Owner" || user?.email === "gadanipranav@gmail.com" || user?.role?.name === "Super Admin";

    useEffect(() => {
        if (isOwnerOrAdmin) {
            fetchCompanyData();
        }
    }, [user, selectedCompany]);

    const fetchCompanyData = async () => {
        try {
            const companyId = selectedCompany?._id;
            const url = companyId ? `/staff/company/settings?companyId=${companyId}` : "/staff/company/settings";
            const res = await API.get(url);
            if (res.data) {
                setCompanyData(res.data);
                setLogoPreview(res.data.appLogo || "");
            }
        } catch (err) {
            console.error("Error fetching settings:", err);
        }
    };

    const handleUpdateCompany = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            Object.keys(companyData).forEach(key => {
                const value = companyData[key];
                if (['_id', '__v', 'createdAt', 'companyId', 'subscription', 'subscriptionStatus', 'subscriptionExpiry'].includes(key)) return;
                if (value === "null" || value === null) return;
                if (key === 'workingHours' || key === 'breakTime' || key === 'holidays') {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, value);
                }
            });
            if (logoFile) formData.append("appLogo", logoFile);
            const companyId = selectedCompany?._id;
            const url = companyId ? `/staff/company/settings?companyId=${companyId}` : "/staff/company/settings";
            await API.put(url, formData, { headers: { "Content-Type": "multipart/form-data" } });
            showToast("Company updated successfully!");
            fetchCompanyData();
        } catch (err) {
            showToast(err.response?.data?.error || "Update failed", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const addHoliday = () => {
        if (!newHoliday.date || !newHoliday.title) return;
        setCompanyData({ ...companyData, holidays: [...companyData.holidays, newHoliday] });
        setNewHoliday({ date: "", title: "" });
    };

    const removeHoliday = (index) => {
        const updated = companyData.holidays.filter((_, i) => i !== index);
        setCompanyData({ ...companyData, holidays: updated });
    };

    const TabButton = ({ id, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                background: "none", border: "none", padding: "12px 0", cursor: "pointer",
                marginRight: '24px',
                fontWeight: "600", color: activeTab === id ? "var(--primary-color)" : "var(--text-muted)",
                borderBottom: activeTab === id ? "2px solid var(--primary-color)" : "2px solid transparent",
                fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.04em", transition: "all 0.2s"
            }}
        >
            {label}
        </button>
    );

    return (
        <div className="profile-page" style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <PageHeader title="Company Profile" />

            {/* TABS Navigation */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "24px", borderBottom: "1px solid var(--ui-border)" }}>
                {isOwnerOrAdmin && <TabButton id="bio" label="Overview" />}
                {isOwnerOrAdmin && <TabButton id="settings" label="Operational Settings" />}
                {isOwnerOrAdmin && <TabButton id="subscription" label="Billing & Subscription" />}
            </div>

            {/* CONTENT AREA */}
            <div className="profile-content" style={{
                background: "var(--ui-surface)",
                padding: "32px",
                borderRadius: "12px",
                border: "1px solid var(--ui-border)",
                boxShadow: "var(--shadow-sm)"
            }}>
                {activeTab === "bio" && (
                    <form onSubmit={handleUpdateCompany}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '48px' }}>
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '24px', color: 'var(--text-main)' }}>Organization Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                                    <TextInput label="Company Name" value={companyData.companyName} onChange={e => setCompanyData({...companyData, companyName: e.target.value})} />
                                    <TextInput label="Business Email" value={companyData.email} onChange={e => setCompanyData({...companyData, email: e.target.value})} />
                                    <TextInput label="Business Phone" value={companyData.phone} onChange={e => setCompanyData({...companyData, phone: e.target.value})} />
                                    <TextInput label="GST Number" value={companyData.gstNumber} onChange={e => setCompanyData({...companyData, gstNumber: e.target.value})} />
                                    <TextInput label="PAN Number" value={companyData.panNumber} onChange={e => setCompanyData({...companyData, panNumber: e.target.value})} />
                                </div>

                                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '24px', color: 'var(--text-main)', marginTop: '40px' }}>Location</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <TextInput label="Address Line 1" value={companyData.addressLine1} onChange={e => setCompanyData({...companyData, addressLine1: e.target.value})} />
                                    <TextInput label="City" value={companyData.city} onChange={e => setCompanyData({...companyData, city: e.target.value})} />
                                    <TextInput label="State" value={companyData.state} onChange={e => setCompanyData({...companyData, state: e.target.value})} />
                                    <TextInput label="Postal Code" value={companyData.pincode} onChange={e => setCompanyData({...companyData, pincode: e.target.value})} />
                                </div>
                            </div>

                            {/* Logo Upload Section */}
                            <div style={{ 
                                padding: '24px', 
                                border: '1px solid var(--ui-border)', 
                                borderRadius: '12px', 
                                textAlign: 'center',
                                background: '#f8fafc',
                                maxHeight: '400px'
                            }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px', display: 'block' }}>Branding Logo</label>
                                <div style={{ 
                                    width: '120px', height: '120px', 
                                    margin: '0 auto 20px', 
                                    background: '#fff', 
                                    borderRadius: '12px', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid var(--ui-border)',
                                    overflow: 'hidden',
                                    padding: '8px'
                                }}>
                                    {logoPreview ? (
                                        <img 
                                            src={logoPreview.startsWith('blob') ? logoPreview : (logoPreview.startsWith('http') ? logoPreview : `${API.defaults.baseURL}${logoPreview}`)} 
                                            alt="Preview" 
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        />
                                    ) : <span style={{ fontSize: '12px', color: '#94a3b8' }}>No Logo</span>}
                                </div>
                                <input type="file" onChange={handleLogoChange} style={{ fontSize: '12px', width: '100%', marginBottom: '12px' }} accept="image/*" />
                                <p style={{ fontSize: '10px', color: 'var(--text-light)' }}>Recommended size 200x200px</p>
                            </div>
                        </div>
                        <div style={{ borderTop: '1px solid var(--ui-border)', marginTop: '40px', paddingTop: '24px', textAlign: 'right' }}>
                            <button type="submit" className="btn btn-primary" disabled={loading}>Update Company Info</button>
                        </div>
                    </form>
                )}

                {activeTab === "settings" && (
                    <form onSubmit={handleUpdateCompany}>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '24px', color: 'var(--text-main)' }}>Operating Hours</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "40px" }}>
                            <TextInput label="Opening Time" type="time" value={companyData.workingHours.start} onChange={e => setCompanyData({...companyData, workingHours:{...companyData.workingHours, start: e.target.value}})} />
                            <TextInput label="Closing Time" type="time" value={companyData.workingHours.end} onChange={e => setCompanyData({...companyData, workingHours:{...companyData.workingHours, end: e.target.value}})} />
                        </div>

                        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '24px', color: 'var(--text-main)', marginTop: '40px' }}>Break Hours</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "40px" }}>
                            <TextInput label="Break Start" type="time" value={companyData.breakTime.start} onChange={e => setCompanyData({...companyData, breakTime:{...companyData.breakTime, start: e.target.value}})} />
                            <TextInput label="Break End" type="time" value={companyData.breakTime.end} onChange={e => setCompanyData({...companyData, breakTime:{...companyData.breakTime, end: e.target.value}})} />
                        </div>

                        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '24px', color: 'var(--text-main)' }}>Public Holidays</h3>
                        <div style={{ border: '1px solid var(--ui-border)', borderRadius: '12px', overflow: 'hidden' }}>
                            <div style={{ background: '#f8fafc', padding: '16px', display: 'flex', gap: '12px', borderBottom: '1px solid var(--ui-border)' }}>
                                <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--ui-border)', flex: 1 }} />
                                <input type="text" placeholder="Holiday Title" value={newHoliday.title} onChange={e => setNewHoliday({...newHoliday, title: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--ui-border)', flex: 2 }} />
                                <button type="button" onClick={addHoliday} className="btn btn-primary">+ Add</button>
                            </div>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {companyData.holidays.map((h, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < companyData.holidays.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '500' }}>{new Date(h.date).toDateString()} — {h.title}</span>
                                        <button type="button" onClick={() => removeHoliday(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '700' }}>Remove</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginTop: '40px', textAlign: 'right' }}>
                            <button type="submit" className="btn btn-primary">Save Operational Settings</button>
                        </div>
                    </form>
                )}

                {activeTab === "subscription" && (
                    <SubscriptionView isSuperAdmin={user?.role?.name === "Super Admin" || user?.email === "gadanipranav@gmail.com"} />
                )}
            </div>
        </div>
    );
}
