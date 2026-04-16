import React, { useEffect, useRef, useState } from "react";
import "../style/main.css";
import DataTable from "../components/common/DataTable";
import FormModal from "../components/common/FormModal";
import PageHeader from "../components/common/PageHeader";
import ConfirmModal from "../components/common/ConfirmModal";
import API from "../api/api";
import { useProject } from "../contexts/ProjectContext";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../contexts/PermissionContext";
import { useCompany } from "../contexts/CompanyContext";



export default function Task({ isIssue = false }) {
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { hasPermission: ctxHasPermission } = usePermissions();

  const isSuperAdmin = user?.email === "gadanipranav@gmail.com" || user?.role?.name === "Super Admin";
  const isCompanyOwner = user?.role?.name === "Company Owner";

  const hasPermission = (module, action = "read") => {
    if (isSuperAdmin || isCompanyOwner) return true;
    // Map generic modules to specific ones if needed
    const actualModule = (isIssue && module === "task_management") ? "issue" : module;
    return ctxHasPermission(actualModule, action);
  };

  // ───── Bulk Upload State ─────
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const bulkInputRef = useRef(null);

  const [mentionQuery, setMentionQuery] = useState(null);
  const [cursorPos, setCursorPos] = useState(0);

  // Get selected project from Header context
  const { selectedProject } = useProject();
  const { selectedCompany } = useCompany();

  // ⚡ Real-time socket
  const { socket } = useSocket();
  const selectedProjectRef = useRef(selectedProject);

  // Keep ref in sync so socket handlers can read latest value
  useEffect(() => {
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);

  const [viewMode, setViewMode] = useState("list"); // Add 'viewMode' state (list or kanban)

  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    status: "",
    project: "",
    priority: "",
    image: null,
    video: null,
    oldImage: "",
    oldVideo: "",
    startDate: "",
    estimatedHours: 0,
    calculatedEndDate: "",
  });

  const [memberSearch, setMemberSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toast notification
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Keep ref in sync so socket handlers can read latest value
  useEffect(() => {
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);

  // Server-side pagination state
  const [serverPage, setServerPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const serverPageSize = 50; // Items per page

  // ================= LOAD =================
  const load = async () => {
    try {
      const [t, st, p, s] = await Promise.all([
        selectedProject
          ? API.get(`/tasks?project=${selectedProject._id}&type=${isIssue ? "issue" : "task"}&page=${serverPage}&limit=${serverPageSize}`)
          : API.get(`/tasks?type=${isIssue ? "issue" : "task"}&page=${serverPage}&limit=${serverPageSize}`),
        selectedProject
          ? API.get(`/task-status?project=${selectedProject._id}`)
          : API.get("/task-status"),
        API.get("/projects"),
        API.get("/staff"),
      ]);

      // ✅ Double safety: also filter by type on client side
      // Issue page: only show type="issue"
      // Task page: show type="task" OR no type (old data)
      let rawTasks = [];
      if (t.data && typeof t.data === 'object' && !Array.isArray(t.data) && t.data.tasks) {
        // Handle paginated response
        rawTasks = t.data.tasks;
        setTotalRecords(t.data.totalCount || 0);
      } else {
        // Handle unpaginated standard array response (safeguard)
        rawTasks = Array.isArray(t.data) ? t.data : [];
        setTotalRecords(rawTasks.length);
      }

      const filteredTasks = isIssue
        ? rawTasks.filter(task => task.type === "issue")
        : rawTasks.filter(task => task.type === "task" || !task.type);

      setTasks(filteredTasks);
      setStatuses(st.data || []);
      setProjects(p.data || []);

      // Filter staff based on selected project's 'assignedTo' list (if a project is selected)
      const allStaff = s.data || [];
      if (selectedProject && selectedProject.assignedTo && selectedProject.assignedTo.length > 0) {
        const assignedIds = selectedProject.assignedTo.map(u => u._id || u);
        // Show only staff/managers who are assigned to this project
        setStaff(allStaff.filter(user => assignedIds.includes(user._id)));
      } else {
        setStaff(allStaff);
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    load();
  }, [selectedProject, isIssue, serverPage, selectedCompany]);

  // Reset to page 1 when project, issue type, or company changes
  useEffect(() => {
    setServerPage(1);
  }, [selectedProject, isIssue, selectedCompany]);

  // ================= CALCULATION LOGIC =================
  useEffect(() => {
    if (form.startDate && form.estimatedHours > 0) {
      const company = selectedCompany || {};
      const holidays = company.holidays || [];
      const workStartTime = company.workingHours?.start || "09:00";
      const workEndTime = company.workingHours?.end || "18:00";
      const breakStartTime = company.breakTime?.start || "13:00";
      const breakEndTime = company.breakTime?.end || "14:00";

      const parseTime = (t) => {
        const [h, m] = t.split(":").map(Number);
        return h + (m || 0) / 60;
      };

      const dailyWorkNet = parseTime(workEndTime) - parseTime(workStartTime) - 
                         (parseTime(breakEndTime) - parseTime(breakStartTime));
      
      let current = new Date(form.startDate);
      let remaining = form.estimatedHours;
      
      const isHoliday = (date) => {
        if (date.getDay() === 0) return true; // Sunday
        return holidays.some(h => new Date(h.date).toDateString() === date.toDateString());
      };

      // Loop to reach end date skipping holidays
      while (remaining > 0) {
        if (isHoliday(current)) {
          current.setDate(current.getDate() + 1);
          current.setHours(parseInt(workStartTime.split(":")[0]), parseInt(workStartTime.split(":")[1]), 0, 0);
          continue;
        }

        // Calculate hours left today
        const [weH, weM] = workEndTime.split(":").map(Number);
        const dayEnd = new Date(current);
        dayEnd.setHours(weH, weM, 0, 0);

        let availableToday = Math.max((dayEnd - current) / (1000 * 60 * 60), 0);
        
        // Adjust for break if needed
        const [bsH, bsM] = breakStartTime.split(":").map(Number);
        const [beH, beM] = breakEndTime.split(":").map(Number);
        const bStart = new Date(current); bStart.setHours(bsH, bsM, 0, 0);
        const bEnd = new Date(current); bEnd.setHours(beH, beM, 0, 0);

        if (current < bStart && dayEnd > bEnd) availableToday -= (parseTime(breakEndTime) - parseTime(breakStartTime));

        if (remaining <= availableToday) {
            current.setMinutes(current.getMinutes() + remaining * 60);
            // If it lands in break, push to end of break
            if (current > bStart && current < bEnd) {
                const diff = (current - bStart) / (1000 * 60);
                current = new Date(bEnd);
                current.setMinutes(current.getMinutes() + diff);
            }
            remaining = 0;
        } else {
            remaining -= availableToday;
            current.setDate(current.getDate() + 1);
            current.setHours(parseInt(workStartTime.split(":")[0]), parseInt(workStartTime.split(":")[1]), 0, 0);
        }
      }

      // Format to YYYY-MM-DDTHH:mm for datetime-local
      const pad = (n) => n.toString().padStart(2, '0');
      const endStr = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}T${pad(current.getHours())}:${pad(current.getMinutes())}`;
      
      if (form.calculatedEndDate !== endStr) {
        setForm(prev => ({ ...prev, calculatedEndDate: endStr }));
      }
    }
  }, [form.startDate, form.estimatedHours, selectedCompany]);


  // ================= SOCKET REAL-TIME =================
  useEffect(() => {
    if (!socket) return;

    // Helper: does this task belong to the current view?
    const isVisible = (task) => {
      // Only show items matching this view's type (task vs issue)
      const taskType = task.type || "task";
      if (taskType !== (isIssue ? "issue" : "task")) return false;

      const proj = selectedProjectRef.current;
      if (!proj) return true; // "All" view
      const taskProjectId = task.project?._id || task.project;
      return taskProjectId === proj._id;
    };

    const onCreated = (task) => {
      if (!isVisible(task)) return;
      setTasks((prev) => {
        // avoid duplicates
        if (prev.find((t) => t._id === task._id)) return prev;
        return [task, ...prev];
      });
    };

    const onUpdated = (task) => {
      if (isVisible(task)) {
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? task : t))
        );
      } else {
        // task moved out of the current project filter — remove it
        setTasks((prev) => prev.filter((t) => t._id !== task._id));
      }
    };

    const onDeleted = ({ _id }) => {
      setTasks((prev) => prev.filter((t) => t._id !== _id));
    };

    socket.on("task:created", onCreated);
    socket.on("task:updated", onUpdated);
    socket.on("task:deleted", onDeleted);

    return () => {
      socket.off("task:created", onCreated);
      socket.off("task:updated", onUpdated);
      socket.off("task:deleted", onDeleted);
    };
  }, [socket]);

  // ================= SAVE =================
  const save = async () => {
    if (loading) return; // Add guards
    // Validation
    if (!form.title.trim()) {
      showToast("Title is required", "error");
      return;
    }
    if (form.title.length > 100) {
      showToast("Title must be 100 characters or less", "error");
      return;
    }
    // Prevent common injection-style characters if strictly requested, 
    // though Mongoose handles this. Let's at least enforce a clean title.
    const titleRegex = /^[a-zA-Z0-9\s\-_.,()]+$/;
    if (!titleRegex.test(form.title)) {
      showToast("Title contains invalid characters", "error");
      return;
    }

    if (!form.description || !form.description.trim()) {
      showToast("Description is required", "error");
      return;
    }
    if (!form.assignedTo) {
      showToast("Please assign a staff member", "error");
      return;
    }
    if (!form.status) {
      showToast("Please select a status", "error");
      return;
    }
    if (!form.project) {
      showToast("Please select a project", "error");
      return;
    }
    if (isIssue && !form.priority) {
      showToast("Please select a priority", "error");
      return;
    }
    if (!editId && !form.image && !form.video) {
      showToast("Please upload at least one image or video", "error");
      return;
    }

    // File Type Validation
    if (form.image && !form.image.type.startsWith("image/")) {
      showToast("Invalid image file format", "error");
      return;
    }
    if (form.video && !form.video.type.startsWith("video/")) {
      showToast("Invalid video file format", "error");
      return;
    }

    const fd = new FormData();

    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("assignedTo", form.assignedTo);
    fd.append("status", form.status);
    fd.append("project", form.project || "");
    fd.append("type", isIssue ? "issue" : "task");
    if (isIssue) fd.append("priority", form.priority);

    if (form.image) {
      fd.append("image", form.image);
    } else if (editId && form.oldImage === "") {
      fd.append("image", "");
    }

    if (form.video) {
      fd.append("video", form.video);
    } else if (editId && form.oldVideo === "") {
      fd.append("video", "");
    }

    if (form.startDate) fd.append("startDate", form.startDate);
    fd.append("estimatedHours", form.estimatedHours || 0);
    if (form.calculatedEndDate) fd.append("calculatedEndDate", form.calculatedEndDate);

    setLoading(true);
    try {
      if (editId) {
        const originalTask = tasks.find(t => t._id === editId);
        if (originalTask) {
          const isSameTitle = originalTask.title === form.title.trim();
          const isSameDesc = originalTask.description === form.description.trim();
          const isSameAssignee = (originalTask.assignedTo?._id || originalTask.assignedTo || "") === form.assignedTo;
          const isSameStatus = (originalTask.status?._id || originalTask.status || "") === form.status;
          const isSameProject = (originalTask.project?._id || originalTask.project || "") === form.project;
          const isSamePriority = !isIssue || (originalTask.priority || "Medium") === form.priority;
          const isImageUnchanged = form.image === null && form.oldImage === originalTask.image;
          const isVideoUnchanged = form.video === null && form.oldVideo === originalTask.video;

          if (isSameTitle && isSameDesc && isSameAssignee && isSameStatus && isSameProject && isSamePriority && isImageUnchanged && isVideoUnchanged) {
            showToast("No changes detected.", "info");
            setShowForm(false);
            setEditId(null);
            setForm({
              title: "",
              description: "",
              assignedTo: "",
              status: "",
              project: "",
              priority: "Medium",
              image: null,
              video: null,
              oldImage: "",
              oldVideo: "",
            });
            setLoading(false);
            return;
          }
        }
        await API.put(`/tasks/${editId}`, fd);
        showToast(`${isIssue ? "Issue" : "Task"} updated successfully!`);
      } else {
        await API.post("/tasks", fd);
        showToast(`${isIssue ? "Issue" : "Task"} added successfully!`);
      }

      setShowForm(false);
      setEditId(null);
      setForm({
        title: "",
        description: "",
        assignedTo: "",
        status: "",
        project: "",
        priority: "Medium",
        image: null,
        video: null,
        oldVideo: "",
        startDate: "",
        estimatedHours: 0,
        calculatedEndDate: "",
      });
      load();
    } catch (error) {
      console.error("Save error:", error);
      showToast("Error saving task", "error");
    } finally {
      setLoading(false);
    }
  };

  // ================= EDIT =================
  const edit = (item) => {
    setForm({
      title: item.title,
      description: item.description,
      assignedTo: item.assignedTo?._id || item.assignedTo,
      status: item.status?._id || item.status,
      project: item.project?._id || item.project || "",
      priority: item.priority || "Medium",
      oldImage: item.image,
      oldVideo: item.video,
      startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : "",
      estimatedHours: item.estimatedHours || 0,
      calculatedEndDate: item.calculatedEndDate ? new Date(item.calculatedEndDate).toISOString().split('T')[0] : "",
    });
    setEditId(item._id);
    setShowForm(true);
  };

  // ================= DELETE =================
  const remove = async (id) => {
    try {
      await API.delete(`/tasks/${id}`);
      showToast("Task deleted successfully!", "delete");
      load();
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Error deleting task", "error");
    }
  };

  // ================= UPDATE INLINE =================
  const updateTaskField = async (taskId, field, value) => {
    const task = tasks.find(t => t._id === taskId);
    if (!task) return;

    const fd = new FormData();
    fd.append("title", task.title || "");
    fd.append("description", task.description || "");
    fd.append("assignedTo", field === "assignedTo" ? value : (task.assignedTo?._id || task.assignedTo || ""));
    fd.append("status", field === "status" ? value : (task.status?._id || task.status || ""));
    fd.append("project", task.project?._id || task.project || "");
    if (isIssue) fd.append("priority", field === "priority" ? value : (task.priority || "Medium"));

    try {
      await API.put(`/tasks/${taskId}`, fd);
      const fieldNames = { assignedTo: "Assignee", status: "Status", priority: "Priority" };
      const displayName = fieldNames[field] || field;
      showToast(`${displayName} updated successfully!`, "success");
      load();
    } catch (error) {
      console.error("Update inline error:", error);
      showToast("Error updating task", "error");
    }
  };

  // ================= HELPER: filter valid staff (Staff + Manager roles) =================
  const getValidStaff = () => {
    return staff.filter(s => {
      const pos = (s.position || "").toLowerCase();
      const roleName = (s.role?.name || "").toLowerCase();
      return pos.includes("staff") || pos.includes("manager") ||
        roleName.includes("staff") || roleName.includes("manager");
    });
  };

  // ================= PRIORITY COLOR =================
  const priorityStyle = (p) => {
    const map = {
      Critical: { bg: "rgba(185, 28, 28, 0.15)", color: "#ef4444", border: "1.5px solid rgba(239, 68, 68, 0.3)" },
      High: { bg: "rgba(249, 115, 22, 0.15)", color: "#f97316", border: "1.5px solid rgba(249, 115, 22, 0.3)" },
      Medium: { bg: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", border: "1.5px solid rgba(59, 130, 246, 0.3)" },
      Low: { bg: "rgba(34, 197, 94, 0.15)", color: "#22c55e", border: "1.5px solid rgba(34, 197, 94, 0.3)" },
    };
    return map[p] || map["Medium"];
  };

  // ================= TABLE =================
  const columns = [
    { header: isIssue ? "Issue" : "Task", key: "title" },
    { header: "Start Date", key: "startDate", render: (v) => v ? new Date(v).toLocaleString() : "—" },
    { header: "Est. Hours", key: "estimatedHours", render: (v) => v ? `${v}h` : "—" },
    { header: "End Date", key: "calculatedEndDate", render: (v) => v ? new Date(v).toLocaleString() : "—" },
    { header: "Description", key: "description" },
    {
      header: "Assigned To",
      key: "assignedTo",
      render: (v) => {
        if (!v) return <span style={{ color: "#94a3b8" }}>—</span>;
        const s = typeof v === 'object' ? v : staff.find(u => u._id === v);
        if (!s) return <span style={{ color: "#94a3b8" }}>—</span>;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "30px", height: "30px", borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary-color), #6366f1)",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontWeight: "800", boxShadow: "0 2px 5px rgba(59, 130, 246, 0.2)"
            }}>
              {s.name?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: "600", color: "var(--text-main)", fontSize: "13px" }}>{s.name}</span>
          </div>
        );
      },
    },
    {
      header: "Status",
      key: "status",
      render: (v, row) => (
        <select
          className="form-control"
          value={v?._id || v || ""}
          onChange={(e) => updateTaskField(row._id, "status", e.target.value)}
          disabled={!hasPermission("task_management", "update")}
        >
          <option value="">Select</option>
          {statuses.map((s) => (
            <option key={s._id || `status-${s.name}`} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      ),
    },
    // Priority column — only in Issue mode
    ...(isIssue ? [{
      header: "Priority",
      key: "priority",
      render: (v, row) => (
        <select
          className="form-control"
          value={v || "Medium"}
          onChange={(e) => updateTaskField(row._id, "priority", e.target.value)}
          disabled={!hasPermission("task_management", "update")}
          style={{
            background: "var(--neu-bg)",
            color: priorityStyle(v || "Medium").color,
            fontWeight: "800",
            border: priorityStyle(v || "Medium").border,
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
            fontSize: "13px",
            boxShadow: "var(--neu-shadow-inner)",
            width: "100%",
            minWidth: "120px",
            cursor: "pointer"
          }}
        >
          {["Low", "Medium", "High", "Critical"].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      ),
    }] : []),
  ];

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

  // ───── Bulk Upload Handler ─────
  const handleBulkUpload = async () => {
    if (!bulkFile) { showToast("Please select a CSV file first", "error"); return; }
    if (!selectedProject) { showToast("Please select a project first", "error"); return; }
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const fd = new FormData();
      fd.append("file", bulkFile);
      // Use API instance (sends httpOnly cookie automatically via withCredentials)
      // timeout: 10 min for large datasets (1 lakh+ rows)
      const res = await API.post(
        `/tasks/bulk-upload?type=${isIssue ? "issue" : "task"}&project=${selectedProject._id}`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" }, timeout: 30 * 60 * 1000 } // 30 min for 10 lakh+ rows
      );
      setBulkResult(res.data);
      setBulkFile(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Bulk upload failed", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDrop = (e) => {
    e.preventDefault();
    setBulkDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setBulkFile(file);
  };

  const downloadSampleCSV = () => {
    const baseURL = window.location.hostname === "localhost"
      ? "http://localhost:5000/api"
      : "https://mzdhklfk-5000.inc1.devtunnels.ms/api";
    const url = `${baseURL}/tasks/bulk-upload/sample?type=${isIssue ? "issue" : "task"}`;
    // Use fetch with credentials:include so the httpOnly auth cookie is sent
    fetch(url, { credentials: "include" })
      .then(r => r.blob())
      .then(blob => {
        const burl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = burl;
        a.download = isIssue ? "issues_sample.csv" : "tasks_sample.csv";
        a.click();
        URL.revokeObjectURL(burl);
      })
      .catch(() => showToast("Failed to download sample", "error"));
  };

  return (
    <div className="page">

      {/* ===== PAGE HEADER WITH BULK UPLOAD BUTTON ===== */}
      <div className="header">
        <h2>
          {isIssue
            ? (selectedProject ? `${selectedProject.name} — Issues` : "All Issues")
            : (selectedProject ? `${selectedProject.name} — Tasks` : "All Tasks")}
        </h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          
          {/* View Mode Toggle */}
          <div style={{ display: "flex", background: "var(--table-bg)", borderRadius: "10px", padding: "4px", border: "1px solid var(--ui-border)" }}>
            <button
              title="List View"
              onClick={() => setViewMode("list")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "8px 10px", border: "none", borderRadius: "8px", cursor: "pointer", transition: "0.2s",
                background: viewMode === "list" ? "#fff" : "transparent",
                color: viewMode === "list" ? "var(--primary-color)" : "var(--text-muted)",
                boxShadow: viewMode === "list" ? "var(--shadow-sm)" : "none"
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </button>
            <button
              title="Kanban View"
              onClick={() => setViewMode("kanban")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "8px 10px", border: "none", borderRadius: "8px", cursor: "pointer", transition: "0.2s",
                background: viewMode === "kanban" ? "#fff" : "transparent",
                color: viewMode === "kanban" ? "var(--primary-color)" : "var(--text-muted)",
                boxShadow: viewMode === "kanban" ? "var(--shadow-sm)" : "none"
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
            </button>
          </div>

          {hasPermission("task_management", "create") && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (!selectedProject) {
                  showToast("Please select a project first", "error");
                  return;
                }
                setBulkFile(null);
                setBulkResult(null);
                setShowBulkModal(true);
              }}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                fontWeight: "700", fontSize: "13px", padding: "9px 16px",
                borderRadius: "10px", border: "2px dashed var(--primary-color)",
                background: "transparent", color: "var(--primary-color)",
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--primary-color)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--primary-color)"; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Bulk Upload
            </button>
          )}

          {hasPermission("task_management", "create") && (
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!selectedProject) {
                  showToast("Please select a specific project from the top menu to create a " + (isIssue ? "issue" : "task"), "error");
                  return;
                }
                setForm({
                  title: "",
                  description: "",
                  assignedTo: "",
                  status: "",
                  project: selectedProject?._id || "",
                  priority: "",
                  image: null,
                  video: null,
                  oldImage: "",
                  oldVideo: "",
                });
                setEditId(null);
                setShowForm(true);
              }}
            >
              {isIssue ? "+ Add Issue" : "+ Add Task"}
            </button>
          )}
        </div>
      </div>

      {/* ===== BULK UPLOAD MODAL ===== */}
      {showBulkModal && (
        <div
          onClick={() => setShowBulkModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--card-bg, #fff)", borderRadius: "18px",
              padding: "36px 40px", maxWidth: "520px", width: "94%",
              boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "var(--text-main)" }}>
                  📤 Bulk Upload {isIssue ? "Issues" : "Tasks"}
                </h2>
              </div>
              <button onClick={() => setShowBulkModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "var(--text-muted)" }}>✕</button>
            </div>

            {/* Sample download */}
            <div style={{
              background: "linear-gradient(135deg,#eff6ff,#dbeafe)", borderRadius: "10px",
              padding: "14px 18px", marginBottom: "20px", border: "1px solid #93c5fd",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#1e40af" }}>Required CSV Columns</div>
                <code style={{ fontSize: "12px", color: "#1e3a8a" }}>
                  {isIssue ? "title, description, assignedTo, status, priority" : "title, description, assignedTo, status"}
                </code>
              </div>
              <button
                onClick={downloadSampleCSV}
                style={{
                  background: "#3b82f6", color: "#fff", border: "none",
                  borderRadius: "8px", padding: "8px 14px", cursor: "pointer",
                  fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap",
                }}
              >
                ⬇ Sample CSV
              </button>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setBulkDragOver(true); }}
              onDragLeave={() => setBulkDragOver(false)}
              onDrop={handleBulkDrop}
              onClick={() => bulkInputRef.current?.click()}
              style={{
                border: `2.5px dashed ${bulkDragOver ? "#3b82f6" : bulkFile ? "#10b981" : "#cbd5e1"}`,
                borderRadius: "14px", padding: "40px 20px", textAlign: "center",
                cursor: "pointer", transition: "all 0.2s", marginBottom: "20px",
                background: bulkDragOver ? "#eff6ff" : bulkFile ? "#f0fdf4" : "var(--table-bg,#f8fafc)",
              }}
            >
              <input
                ref={bulkInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: "none" }}
                onChange={e => setBulkFile(e.target.files[0] || null)}
              />
              {bulkFile ? (
                <>
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>✅</div>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "#059669" }}>{bulkFile.name}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                    {(bulkFile.size / 1024 / 1024).toFixed(2)} MB — click to change
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>☁️</div>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-main)" }}>Drag &amp; Drop your CSV here</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>or click to browse — .csv, .xlsx, .xls</div>
                </>
              )}
            </div>

            {/* Result box */}
            {bulkResult && (
              <div style={{
                background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", borderRadius: "12px",
                padding: "16px 20px", marginBottom: "16px", border: "1px solid #86efac",
              }}>
                <div style={{ fontWeight: "800", fontSize: "14px", color: "#15803d", marginBottom: "8px" }}>✅ Upload Complete!</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
                  {[{ label: "Total", value: bulkResult.total, color: "#1e293b" },
                  { label: "Inserted", value: bulkResult.inserted, color: "#059669" },
                  { label: "Skipped", value: bulkResult.skipped, color: "#dc2626" }].map(s => (
                    <div key={s.label} style={{
                      background: "#fff", borderRadius: "10px", padding: "12px 8px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                    }}>
                      <div style={{ fontSize: "22px", fontWeight: "900", color: s.color }}>{s.value?.toLocaleString()}</div>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowBulkModal(false)}
                style={{
                  padding: "10px 24px", background: "var(--table-bg,#f3f4f6)",
                  color: "var(--text-main)", border: "none", borderRadius: "10px",
                  cursor: "pointer", fontSize: "14px", fontWeight: "700",
                }}
              >
                Close
              </button>
              <button
                onClick={handleBulkUpload}
                disabled={bulkLoading || !bulkFile}
                style={{
                  padding: "10px 28px",
                  background: bulkLoading || !bulkFile ? "#cbd5e1" : "linear-gradient(135deg,#6366f1,#3b82f6)",
                  color: "#fff", border: "none", borderRadius: "10px",
                  cursor: bulkLoading || !bulkFile ? "not-allowed" : "pointer",
                  fontSize: "14px", fontWeight: "800",
                  boxShadow: bulkLoading || !bulkFile ? "none" : "0 4px 14px rgba(99,102,241,0.4)",
                  display: "flex", alignItems: "center", gap: "8px",
                  transition: "all 0.2s",
                }}
              >
                {bulkLoading ? (
                  <>
                    <span style={{
                      width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: "#fff", borderRadius: "50%",
                      display: "inline-block", animation: "spin 0.8s linear infinite"
                    }} />
                    Uploading...
                  </>
                ) : "⬆ Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FORM ================= */}
      <FormModal
        show={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? (isIssue ? "Edit Issue" : "Edit Task") : (isIssue ? "Add Issue" : "Add Task")}
        onSave={save}
        loading={loading}
      >
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontWeight: "700", display: "block", marginBottom: "8px", fontSize: "14px", color: "var(--text-main)" }}>Title <span style={{ color: "red" }}>*</span></label>
          <input
            className="form-control"
            placeholder="Enter title"
            maxLength={100}
            value={form.title || ""}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={{ color: "var(--text-main)" }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontWeight: "700", display: "block", marginBottom: "8px", fontSize: "14px", color: "var(--text-main)" }}>Description <span style={{ color: "red" }}>*</span></label>
          <div style={{ position: "relative" }}>
            <textarea
              className="form-control"
              placeholder="Describe the task. Tip: Use @ followed by a name to mention team members."
              value={form.description || ""}
              onChange={handleDescriptionChange}
              rows={4}
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
                {getValidStaff()
                  .filter(s => s.name.toLowerCase().includes(mentionQuery))
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
                      onMouseEnter={(e) => e.target.style.background = "#f1f5f9"}
                      onMouseLeave={(e) => e.target.style.background = "#fff"}
                    >
                      <span style={{ fontWeight: "600", color: "#1e293b" }}>{s.name}</span>
                      <span style={{ color: "#94a3b8", marginLeft: "6px", fontSize: "11px" }}>
                        ({s.position || s.role?.name || "Staff"})
                      </span>
                    </div>
                  ))}
                {getValidStaff().filter(s => s.name.toLowerCase().includes(mentionQuery)).length === 0 && (
                  <div style={{ padding: "8px 12px", fontSize: "12px", color: "#94a3b8" }}>No members found</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Assign Staff <span style={{ color: "red" }}>*</span></label>
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <div style={{ position: "relative" }}>
               <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /></svg>
               </span>
               <input
                 type="text"
                 className="form-control"
                 placeholder={form.assignedTo ? "Change staff member..." : "Choose a staff member..."}
                 value={memberSearch}
                 onFocus={() => setIsDropdownOpen(true)}
                 onChange={(e) => setMemberSearch(e.target.value)}
                 style={{ paddingLeft: '42px' }}
               />
            </div>

            {/* Selection Chip */}
            {form.assignedTo && !isDropdownOpen && !memberSearch && (
              <div style={{ marginTop: "12px" }}>
                 {(() => {
                    const s = staff.find(u => u._id === form.assignedTo);
                    if(!s) return null;
                    return (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "8px", background: "var(--primary-light)", border: "1px solid var(--primary-color)" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--primary-color)" }}>{s.name}</span>
                        <span style={{ cursor: "pointer", marginLeft: "4px", color: "var(--primary-color)" }} onClick={() => setForm({ ...form, assignedTo: "" })}>×</span>
                      </div>
                    )
                 })()}
              </div>
            )}

            {/* Dropdown List */}
            {isDropdownOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#ffffff", borderRadius: "12px", maxHeight: "180px", overflowY: "auto", boxShadow: "var(--shadow-lg)", marginTop: "8px", border: "1px solid var(--ui-border)", padding: "4px" }}>
                {getValidStaff()
                  .filter(s => s.name?.toLowerCase().includes(memberSearch.toLowerCase()))
                  .map(s => (
                      <div
                        key={s._id}
                        onClick={() => { setForm({ ...form, assignedTo: s._id }); setMemberSearch(""); setIsDropdownOpen(false); }}
                        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", cursor: "pointer", borderRadius: "8px", background: form.assignedTo === s._id ? "var(--primary-light)" : "transparent" }}
                      >
                         <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "800" }}>{s.name?.charAt(0).toUpperCase()}</div>
                         <div style={{ fontWeight: "600", fontSize: "14px" }}>{s.name}</div>
                      </div>
                  ))}
              </div>
            )}
          </div>
        </div>



        <div className="form-group">
          <label>Task Status <span style={{ color: "red" }}>*</span></label>
          <select className="form-control" value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="">Choose status...</option>
            {statuses.map((s) => ( <option key={s._id} value={s._id}>{s.name}</option> ))}
          </select>
        </div>

        <div className="form-row">
            <div className="form-group">
                <label>Start Date</label>
                <input type="datetime-local" className="form-control" value={form.startDate || ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="form-group">
                <label>Est. Hours</label>
                <input type="number" className="form-control" placeholder="Hours" value={form.estimatedHours || ""} onChange={(e) => setForm({ ...form, estimatedHours: Number(e.target.value) })} />
            </div>
            <div className="form-group">
                <label>Calc. End Date</label>
                <input type="datetime-local" className="form-control" value={form.calculatedEndDate || ""} readOnly />
            </div>
        </div>

        {/* PRIORITY — only in Issue mode */}
        {isIssue && (
          <div className="form-group">
            <label>Priority <span style={{ color: "red" }}>*</span></label>
            <select
              className="form-control"
              value={form.priority || ""}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              style={{
                background: "#fdfefe",
                borderLeft: form.priority ? `4px solid ${priorityStyle(form.priority).color}` : "1.5px solid #e5e7eb",
                fontWeight: "700"
              }}
            >
              <option value="">Select Priority...</option>
              {["Low", "Medium", "High", "Critical"].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}

        {/* IMAGE */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px", fontSize: "14px", color: "var(--text-main)" }}>
            Upload Photo (Max 50MB, Single File) {!editId && <span style={{ color: "red" }}>*</span>}
          </label>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="file"
              accept="image/*"
              className="form-control"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file && file.size > 50 * 1024 * 1024) {
                  showToast("File size exceed 50MB limit", "error");
                  e.target.value = "";
                  return;
                }
                if (file && !file.type.startsWith("image/")) {
                  showToast("Only image files are allowed", "error");
                  e.target.value = "";
                  return;
                }
                setForm({ ...form, image: file });
              }}
            />
            {form.image && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => setForm({ ...form, image: null })}
                style={{ padding: "8px 12px", borderRadius: "6px", fontSize: "12px", border: "none", background: "var(--danger-color)", color: "#fff", cursor: "pointer" }}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {form.oldImage && (
          <div style={{ position: "relative", display: "inline-block", marginBottom: "20px" }}>
            <img
              src={`http://localhost:5000/uploads/${form.oldImage}`}
              width="120"
              alt=""
              style={{ borderRadius: "8px", border: "1px solid var(--border-color)" }}
            />
            <button
              type="button"
              onClick={() => setForm({ ...form, oldImage: "" })}
              style={{
                position: "absolute",
                top: "-10px",
                right: "-10px",
                background: "var(--danger-color)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }}
              title="Remove existing image"
            >
              ×
            </button>
          </div>
        )}

        {/* VIDEO */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px", fontSize: "14px", color: "var(--text-main)" }}>
            Upload Video (Max 50MB, Single File)
          </label>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="file"
              accept="video/*"
              className="form-control"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file && file.size > 50 * 1024 * 1024) {
                  showToast("File size exceed 50MB limit", "error");
                  e.target.value = "";
                  return;
                }
                if (file && !file.type.startsWith("video/")) {
                  showToast("Only video files are allowed", "error");
                  e.target.value = "";
                  return;
                }
                setForm({ ...form, video: file });
              }}
            />
            {form.video && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => setForm({ ...form, video: null })}
                style={{ padding: "8px 12px", borderRadius: "6px", fontSize: "12px", border: "none", background: "var(--danger-color)", color: "#fff", cursor: "pointer" }}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {form.oldVideo && (
          <div style={{ position: "relative", display: "inline-block", marginBottom: "20px" }}>
            <video
              src={`http://localhost:5000/uploads/${form.oldVideo}`}
              width="200"
              controls
              style={{ borderRadius: "8px", border: "1px solid var(--border-color)" }}
            />
            <button
              type="button"
              onClick={() => setForm({ ...form, oldVideo: "" })}
              style={{
                position: "absolute",
                top: "-10px",
                right: "-10px",
                background: "var(--danger-color)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }}
              title="Remove existing video"
            >
              ×
            </button>
          </div>
        )}
      </FormModal>

      {/* ================= DATA VIEW (LIST / KANBAN) ================= */}
      {viewMode === "list" ? (
        <DataTable
          data={tasks}
          columns={columns}
          onEdit={hasPermission("task_management", "update") ? edit : null}
          onDelete={hasPermission("task_management", "delete") ? remove : null}
          serverSide={true}
          totalRecords={totalRecords}
          serverCurrentPage={serverPage}
          pageSize={serverPageSize}
          onPageChange={(p) => setServerPage(p)}
        />
      ) : (
        <div style={{ display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "20px", marginTop: "20px" }}>
          {statuses.map(s => {
            const colTasks = tasks.filter(t => (t.status?._id || t.status) === s._id);
            return (
              <div
                key={s._id}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("taskId");
                  if (taskId) updateTaskField(taskId, "status", s._id);
                }}
                style={{
                  minWidth: "320px", width: "320px", background: "var(--ui-surface)", borderRadius: "12px", border: "1px solid var(--ui-border)", padding: "16px", display: "flex", flexDirection: "column", height: "fit-content", minHeight: "60vh"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                   <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.name}</h3>
                   <span style={{ background: "var(--ui-border)", color: "var(--text-main)", fontSize: "12px", fontWeight: "800", padding: "2px 8px", borderRadius: "12px" }}>{colTasks.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                  {colTasks.map(t => {
                    const assignedUser = typeof t.assignedTo === 'object' ? t.assignedTo : staff.find(u => u._id === t.assignedTo);
                    return (
                      <div
                        key={t._id}
                        draggable={hasPermission("task_management", "update")}
                        onDragStart={e => e.dataTransfer.setData("taskId", t._id)}
                        style={{
                          background: "var(--ui-bg)", padding: "16px", borderRadius: "10px", boxShadow: "var(--shadow-sm)", border: "1px solid var(--ui-border)", cursor: hasPermission("task_management", "update") ? "grab" : "default", transition: "transform 0.2s"
                        }}
                        onMouseEnter={e => { if(hasPermission("task_management", "update")) e.currentTarget.style.transform = "translateY(-2px)"; }}
                        onMouseLeave={e => { if(hasPermission("task_management", "update")) e.currentTarget.style.transform = "translateY(0)"; }}
                        onClick={() => hasPermission("task_management", "update") && edit(t)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-main)", lineHeight: "1.4" }}>{t.title}</div>
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "14px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.5" }}>{t.description}</div>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          {assignedUser ? (
                            <div title={assignedUser.name} style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                              {assignedUser.name.charAt(0).toUpperCase()}
                            </div>
                          ) : <div />}
                          {isIssue && t.priority && (
                             <span style={{ fontSize: "10.5px", fontWeight: "800", padding: "4px 8px", borderRadius: "6px", background: priorityStyle(t.priority).bg, color: priorityStyle(t.priority).color }}>{t.priority}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {
        tasks.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "40px",
            color: "var(--text-muted)",
            fontSize: "15px",
          }}>
            {selectedProject
              ? `No ${isIssue ? "issues" : "tasks"} found for "${selectedProject.name}". Click "+ Add ${isIssue ? "Issue" : "Task"}" to create one.`
              : `No ${isIssue ? "issues" : "tasks"} found. Click "+ Add ${isIssue ? "Issue" : "Task"}" to create one.`}

          </div>
        )
      }

      {/* TOAST */}
      {toast && (
        <div className={`toast toast-${toast.type === 'delete' ? 'error' : (toast.type || 'success')}`}>
          {toast.type === 'success' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
          {(toast.type === 'error' || toast.type === 'delete') && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>}
          {toast.msg}
        </div>
      )}
    </div >
  );
}