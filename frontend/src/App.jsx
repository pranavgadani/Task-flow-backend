import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SocketProvider } from "./contexts/SocketContext";
import { PermissionProvider, usePermissions } from "./contexts/PermissionContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
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

// ============ Inner component (uses AuthContext + PermissionContext) ============
function AppRoutes() {
  // 🧹 Clean up old localStorage keys (no longer needed)
  localStorage.removeItem("permissions");
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  const { user, loading: authLoading } = useAuth();
  const { hasPermission: ctxHasPermission } = usePermissions();

  // Super Admin check
  const isSuperAdmin = user?.email === "gadanipranav@gmail.com" || user?.role?.name === "Super Admin";

  // hasPermission — always from MongoDB via PermissionContext
  const hasPermission = (module, action = "read") => {
    if (isSuperAdmin) return true;
    return ctxHasPermission(module, action);
  };

  // Wait for auth check before rendering routes
  if (authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px", color: "#6b7280" }}>
        Loading...
      </div>
    );
  }

  return (
    <Routes>

      {/* LOGIN */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* PROTECTED ROUTES */}
      <Route
        path="/"
        element={user ? <Layout /> : <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} />}
      >
        <Route index element={<Dashboard />} />
        <Route path="staff" element={hasPermission("staff_management", "read") ? <Staff /> : <Navigate to="/" />} />
        <Route path="task" element={hasPermission("task_management", "read") ? <Task key="task-page" /> : <Navigate to="/" />} />
        <Route path="role" element={hasPermission("role_management", "read") ? <Role /> : <Navigate to="/" />} />
        <Route path="project" element={hasPermission("project_management", "read") ? <Project /> : <Navigate to="/" />} />
        <Route path="permission" element={hasPermission("permission_management", "read") ? <Permission /> : <Navigate to="/" />} />
        <Route path="task-status" element={hasPermission("task_status_management", "read") ? <TaskStatus /> : <Navigate to="/" />} />
        <Route path="team" element={hasPermission("project_management", "read") ? <Team /> : <Navigate to="/" />} />
        <Route path="issue" element={hasPermission("task_management", "read") ? <Task key="issue-page" isIssue={true} /> : <Navigate to="/" />} />
        <Route path="document" element={<Document />} />
      </Route>

    </Routes>
  );
}

// ============ Root App ============
function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <AuthProvider>
          <PermissionProvider>
            <AppRoutes />
          </PermissionProvider>
        </AuthProvider>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;