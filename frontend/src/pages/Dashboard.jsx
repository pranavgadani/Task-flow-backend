import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useProject } from "../contexts/ProjectContext";
import API from "../api/api";
import "../style/main.css"; // Reuse existing styles if any, or inline

export default function Dashboard() {
  const { user } = useAuth();
  const { selectedProject } = useProject();

  const [stats, setStats] = useState({
    staffCount: 0,
    projectCount: 0,
    taskCount: 0,
    issueCount: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch all necessary data concurrently
        const [staffRes, projectsRes, allTasksRes] = await Promise.all([
          API.get("/staff"),
          API.get("/projects"),
          API.get(selectedProject ? `/tasks?project=${selectedProject._id}` : "/tasks")
        ]);

        const rawStaff = Array.isArray(staffRes.data) ? staffRes.data : staffRes.data?.staff || [];
        const rawProjects = Array.isArray(projectsRes.data) ? projectsRes.data : [];
        const rawTasks = Array.isArray(allTasksRes.data) ? allTasksRes.data : [];

        // Calculate counts
        let staffCount = rawStaff.length;
        let projectCount = rawProjects.length;

        // If a project is selected, we filter staff and project count to basically just reflect that project scope
        if (selectedProject) {
          projectCount = 1; // You are viewing 1 project
          if (selectedProject.assignedTo && selectedProject.assignedTo.length > 0) {
            const assignedIds = selectedProject.assignedTo.map(u => u._id || u);
            staffCount = rawStaff.filter(s => assignedIds.includes(s._id)).length;
          } else {
            staffCount = 0;
          }
        }

        const taskCount = rawTasks.filter(t => t.type === "task" || !t.type).length;
        const issueCount = rawTasks.filter(t => t.type === "issue").length;

        setStats({
          staffCount,
          projectCount,
          taskCount,
          issueCount,
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedProject]);

  const StatCard = ({ title, value, icon, bgColor, color }) => (
    <div style={{
      background: "var(--neu-bg)",
      borderRadius: "24px",
      padding: "24px",
      display: "flex",
      alignItems: "center",
      gap: "20px",
      boxShadow: "var(--neu-shadow-sm)",
      border: "1px solid rgba(255, 255, 255, 0.05)",
      transition: "transform 0.2s ease",
      height: '110px'
    }}>
      <div style={{
        background: bgColor,
        color: color,
        width: "54px",
        height: "54px",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        flexShrink: 0,
        boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.05)"
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{
          margin: 0,
          color: "var(--text-muted)",
          fontSize: "11px",
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "2px"
        }}>
          {title}
        </p>
        <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "28px", fontWeight: "900", lineHeight: 1 }}>
          {loading ? "..." : value}
        </h3>
      </div>
    </div>
  );

  return (
    <div className="page" style={{ background: 'transparent' }}>
      {/* Header Section */}
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "32px", color: "var(--text-main)", fontWeight: "900", letterSpacing: "-0.5px" }}>
            {selectedProject ? selectedProject.name : "Global Dashboard"}
          </h1>
          <p style={{ margin: "8px 0 0 0", color: "var(--text-muted)", fontSize: "16px", fontWeight: "600" }}>
            Welcome back, <strong style={{ color: "var(--primary-color)", fontWeight: "800" }}>{user?.name || "User"}</strong>! 🚀
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "24px",
        marginBottom: "32px"
      }}>
        {!selectedProject && (
          <StatCard
            title="Total Projects"
            value={stats.projectCount}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            bgColor="linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)"
            color="#4338ca"
          />
        )}
        <StatCard
          title="Total Tasks"
          value={stats.taskCount}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          bgColor="linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
          color="#15803d"
        />
        <StatCard
          title="Open Issues"
          value={stats.issueCount}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1.5" fill="currentColor" />
            </svg>
          }
          bgColor="linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)"
          color="#b91c1c"
        />
        <StatCard
          title={selectedProject ? "Members" : "Total Staff"}
          value={stats.staffCount}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M23 21V19C22.9993 18.1137 22.7044 17.2522 22.1614 16.5523C21.6184 15.8524 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          bgColor="linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)"
          color="#7e22ce"
        />
      </div>

      {/* User Info Card (Profile Quick View) */}
      <div style={{
        background: "var(--neu-bg)",
        borderRadius: "24px",
        padding: "32px",
        boxShadow: "var(--neu-shadow-sm)",
        border: "1px solid rgba(255,255,255,0.05)",
        display: "inline-block",
        minWidth: "400px"
      }}>
        <h3 style={{
          margin: "0 0 24px 0",
          color: "var(--text-main)",
          fontSize: "20px",
          fontWeight: "900",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
          paddingBottom: "16px",
          letterSpacing: "-0.3px",
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          Account Member
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-light)", fontSize: "11px", fontWeight: "800", textTransform: 'uppercase', letterSpacing: '1px' }}>Full Name</span>
            <span style={{ fontWeight: "800", color: "var(--text-main)", fontSize: "15px" }}>{user?.name || 'N/A'}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-light)", fontSize: "11px", fontWeight: "800", textTransform: 'uppercase', letterSpacing: '1px' }}>Email ID</span>
            <span style={{ fontWeight: "700", color: "var(--text-muted)", fontSize: "14px" }}>{user?.email || 'N/A'}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-light)", fontSize: "11px", fontWeight: "800", textTransform: 'uppercase', letterSpacing: '1px' }}>Assigned Role</span>
            <span style={{
              fontWeight: "900",
              color: "var(--primary-color)",
              background: "rgba(37, 99, 235, 0.08)",
              padding: "4px 12px",
              borderRadius: "8px",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: '0.5px'
            }}>
              {(user.email === "gadanipranav@gmail.com" || user.role?.name === "Super Admin") ? "Super Admin" : user.role?.name || "User"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-light)", fontSize: "11px", fontWeight: "800", textTransform: 'uppercase', letterSpacing: '1px' }}>Status</span>
            <span style={{
              padding: "6px 14px",
              fontSize: "11px",
              fontWeight: "900",
              background: "#dcfce7",
              color: "#16a34a",
              borderRadius: "20px",
              textTransform: "uppercase",
              letterSpacing: '0.5px'
            }}>
              ACTIVE
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}