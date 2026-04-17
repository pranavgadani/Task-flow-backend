import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SocketProvider } from "./contexts/SocketContext";
import { PermissionProvider, usePermissions } from "./contexts/PermissionContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import Layout from "./layout/Layout";
import Dashboard from "./pages/Dashboard";
import Staff from "./pages/Staff";
import Task from "./pages/Task";
import Role from "./pages/Role";
import Permission from "./pages/Permission";
import TaskStatus from "./pages/TaskStatus";
import Login from "./pages/Login";
import Project from "./pages/Project";
import Team from "./pages/Team";
import Document from "./pages/Document";
import ResetPassword from "./pages/ResetPassword";
import CompanyRegister from "./pages/CompanyRegister";
import ForgotPassword from "./pages/ForgotPassword";
import CompanyList from "./pages/CompanyList";
import Subscription from "./pages/Subscription";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Client from "./pages/Client";

import { CompanyProvider } from "./contexts/CompanyContext";

// ============ Inner component (uses AuthContext + PermissionContext) ============
function AppRoutes() {


  const { user, loading: authLoading } = useAuth();
  const { hasPermission: ctxHasPermission, loading: permissionLoading } = usePermissions();

  // Super Admin check
  const isSuperAdmin = user?.email === "gadanipranav@gmail.com" || user?.role?.name === "Super Admin";

  // hasPermission — always from MongoDB via PermissionContext
  const hasPermission = (module, action = "read") => {
    if (isSuperAdmin) return true;
    return ctxHasPermission(module, action);
  };

  // Wait for auth & permission check before rendering routes
  if (authLoading || (user && permissionLoading)) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px", color: "#6b7280", background: 'var(--neu-bg)' }}>
        <div className="loading-spinner"></div>
        Loading permissions...
      </div>
    );
  }

  const isOwnerOrAdmin = isSuperAdmin || user?.role?.name === "Company Owner";

  return (
    <Routes>

      {/* LOGIN */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register-company" element={<CompanyRegister />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* PROTECTED ROUTES */}
      <Route
        path="/"
        element={user ? <Layout /> : <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} />}
      >
        <Route index element={<Dashboard />} />
        <Route path="staff" element={hasPermission("staff_management", "read") ? <Staff /> : <Navigate to="/" />} />
        <Route path="task" element={hasPermission("task_management", "read") ? <Task key="task-page" /> : <Navigate to="/" />} />
        <Route path="role" element={hasPermission("role_management", "read") ? <Role /> : <Navigate to="/" />} />
        <Route path="project" element={hasPermission("project_management", "read") ? <Project /> : <Navigate to="/" />} />
        <Route path="permission" element={hasPermission("permission_management", "read") ? <Permission /> : <Navigate to="/" />} />
        <Route path="task-status" element={hasPermission("task_status_management", "read") ? <TaskStatus /> : <Navigate to="/" />} />
        <Route path="team" element={hasPermission("project_management", "read") ? <Team /> : <Navigate to="/" />} />
        <Route path="issue" element={hasPermission("issue", "read") ? <Task key="issue-page" isIssue={true} /> : <Navigate to="/" />} />
        <Route path="document" element={hasPermission("document", "read") ? <Document /> : <Navigate to="/" />} />
        <Route path="companies" element={isSuperAdmin ? <CompanyList /> : <Navigate to="/" />} />
        <Route path="subscription" element={<Subscription />} />
        <Route path="profile" element={isOwnerOrAdmin ? <Profile /> : <Navigate to="/" />} />
        <Route path="chat" element={<Chat />} />
        <Route path="clients" element={isOwnerOrAdmin ? <Client /> : <Navigate to="/" />} />
      </Route>

    </Routes>
  );
}

// ============ Root App ============
function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <PermissionProvider>
              <CompanyProvider>
                <AppRoutes />
              </CompanyProvider>
            </PermissionProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;