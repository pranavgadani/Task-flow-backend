import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../contexts/PermissionContext";

export default function Sidebar() {
  const [openDropdown, setOpenDropdown] = useState("");
  const { user } = useAuth();
  const { hasPermission: ctxHasPermission } = usePermissions();
  const location = useLocation();

  // Auto-open dropdown if one of its sub-items is active
  useEffect(() => {
    const menuItems = [
      {
        name: "Project",
        subItems: [
          { path: "/project" },
          { path: "/task" },
          { path: "/issue" },
          { path: "/task-status" },
          { path: "/team" },
          { path: "/document" },
          { path: "/clients" }
        ]
      },
      {
        name: "Settings",
        subItems: [
          { path: "/subscription" },
          { path: "/profile" }
        ]
      }
    ];

    const activeDropdown = menuItems.find(item =>
      item.subItems?.some(subItem => location.pathname === subItem.path)
    );

    if (activeDropdown) {
      setOpenDropdown(activeDropdown.name);
    }
  }, [location.pathname]);

  const isSuperAdmin = user?.email === "gadanipranav@gmail.com" || user?.role?.name === "Super Admin";
  const isCompanyOwner = user?.role?.name === "Company Owner";

  // Permission check from MongoDB
  const hasPermission = (module, action = "read") => {
    if (isSuperAdmin || isCompanyOwner) return true;
    return ctxHasPermission(module, action);
  };



  const menuItems = [
    { name: "Dashboard", path: "/", permission: "view_dashboard", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg> },
    {
      name: "Project",
      permission: "project_management",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-1.22-1.8A2 2 0 0 0 7.53 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>,
      subItems: [
        { name: "Projects",    path: "/project",     permission: "project_management" },
        { name: "Task",        path: "/task",        permission: "task_management" },
        { name: "Issue",       path: "/issue",       permission: "issue" },
        { name: "Task Status", path: "/task-status", permission: "task_status_management" },
        { name: "Team",        path: "/team",        permission: "project_management" },
        { name: "Document",    path: "/document",   permission: "document" },
        ...(isCompanyOwner || isSuperAdmin ? [{ name: "Clients", path: "/clients", permission: "project_management" }] : []),
      ]
    },
    { name: "Staff", path: "/staff", permission: "staff_management", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
    { name: "Role", path: "/role", permission: "role_management", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
    { name: "Permission", path: "/permission", permission: "permission_management", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> },
    ...(isSuperAdmin ? [{ name: "Companies", path: "/companies", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg> }] : []),
    ...(isCompanyOwner || isSuperAdmin ? [{ name: "Company Profile", path: "/profile", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }] : []),
  ];

  const handleDropdownClick = (name) => {
    setOpenDropdown(openDropdown === name ? "" : name);
  };

  const isDropdownActive = (subItems) => {
    return subItems.some(subItem => location.pathname === subItem.path);
  };

  return (
    <div className="sidebar">
      <h2 style={{ fontSize: user?.companyId?.companyName ? '20px' : '24px' }}>
        {user?.companyId?.companyName || "TaskFlow"}
      </h2>

      <div className="sidebar-menu">
        {menuItems.map(item => {
          // Check parent permission OR any child permission
          const hasParentPerm = item.permission ? (isSuperAdmin || hasPermission(item.permission)) : true;
          const hasAnyChildPerm = item.subItems?.some(sub => isSuperAdmin || hasPermission(sub.permission)) || false;
          
          const canViewParent = hasParentPerm || hasAnyChildPerm;

          if (!canViewParent) return null;

          if (item.subItems) {
            return (
              <div key={item.name} className="sidebar-dropdown">
                <div
                  onClick={() => handleDropdownClick(item.name)}
                  className={`sidebar-dropdown-header ${isDropdownActive(item.subItems) ? 'active' : ''}`}
                >
                  <span className="sidebar-item-text">
                    {item.icon && <span className="sidebar-icon">{item.icon}</span>}
                    {item.name}
                  </span>
                  <span className="dropdown-arrow">{openDropdown === item.name ? "▲" : "▼"}</span>
                </div>
                {openDropdown === item.name && (
                  <div className="sidebar-dropdown-items">
                    {item.subItems.map(subItem => {
                      if (isSuperAdmin || hasPermission(subItem.permission)) {
                        const isActive = location.pathname === subItem.path;
                        return (
                          <Link key={subItem.path} to={subItem.path} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                            {subItem.name}
                          </Link>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={item.path} className="sidebar-item">
              <Link to={item.path} className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}>
                {item.icon && <span className="sidebar-icon">{item.icon}</span>}
                {item.name}
              </Link>
            </div>
          );
        })}

      </div>
    </div>
  );
}