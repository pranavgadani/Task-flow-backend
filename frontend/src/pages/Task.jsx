import React, { useEffect, useRef, useState } from "react";
import "../style/main.css";
import DataTable from "../components/common/DataTable";
import FormModal from "../components/common/FormModal";
import PageHeader from "../components/common/PageHeader";
import API from "../api/api";
import { useProject } from "../contexts/ProjectContext";
import { useSocket } from "../contexts/SocketContext";

export default function Task({ isIssue = false }) {
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  // Mention system state
  const [mentionQuery, setMentionQuery] = useState(null);
  const [cursorPos, setCursorPos] = useState(0);

  // Get selected project from Header context
  const { selectedProject } = useProject();

  // ⚡ Real-time socket
  const { socket } = useSocket();
  const selectedProjectRef = useRef(selectedProject);

  const [form, setForm] = useState({
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

  // Keep ref in sync so socket handlers can read latest value
  useEffect(() => {
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);

  // ================= LOAD =================
  const load = async () => {
    try {
      const [t, st, p, s] = await Promise.all([
        selectedProject
          ? API.get(`/tasks?project=${selectedProject._id}&type=${isIssue ? "issue" : "task"}`)
          : API.get(`/tasks?type=${isIssue ? "issue" : "task"}`),
        selectedProject
          ? API.get(`/task-status?project=${selectedProject._id}`)
          : API.get("/task-status"),
        API.get("/projects"),
        API.get("/staff"),
      ]);

      // ✅ Double safety: also filter by type on client side
      // Issue page: only show type="issue"
      // Task page: show type="task" OR no type (old data)
      const rawTasks = t.data || [];
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
  }, [selectedProject, isIssue]);


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
    const fd = new FormData();

    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("assignedTo", form.assignedTo);
    fd.append("status", form.status);
    fd.append("project", form.project || "");
    fd.append("type", isIssue ? "issue" : "task");
    if (isIssue) fd.append("priority", form.priority || "Medium");

    if (form.image) fd.append("image", form.image);
    if (form.video) fd.append("video", form.video);

    try {
      if (editId)
        await API.put(`/tasks/${editId}`, fd);
      else
        await API.post("/tasks", fd);

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
      load();
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving task: " + (error.response?.data?.error || error.message));
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
    });
    setEditId(item._id);
    setShowForm(true);
  };

  // ================= DELETE =================
  const remove = async (id) => {
    if (window.confirm("Delete task?")) {
      await API.delete(`/tasks/${id}`);
      load();
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
      load();
    } catch (error) {
      console.error("Update inline error:", error);
      alert("Error updating task: " + (error.response?.data?.error || error.message));
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
      Critical: { bg: "#fee2e2", color: "#b91c1c" },
      High: { bg: "#ffedd5", color: "#c2410c" },
      Medium: { bg: "#dbeafe", color: "#1d4ed8" },
      Low: { bg: "#dcfce7", color: "#15803d" },
    };
    return map[p] || map["Medium"];
  };

  // ================= TABLE =================
  const columns = [
    { header: isIssue ? "Issue" : "Task", key: "title" },
    { header: "Description", key: "description" },
    {
      header: "Assigned To",
      key: "assignedTo",
      render: (v, row) => (
        <select
          className="form-control"
          value={v?._id || v || ""}
          onChange={(e) => updateTaskField(row._id, "assignedTo", e.target.value)}
        >
          <option value="">Select</option>
          {getValidStaff().map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} {s.position || s.role?.name ? `(${s.position || s.role?.name})` : ""}
            </option>
          ))}
        </select>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (v, row) => (
        <select
          className="form-control"
          value={v?._id || v || ""}
          onChange={(e) => updateTaskField(row._id, "status", e.target.value)}
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
          style={{
            background: priorityStyle(v || "Medium").bg,
            color: priorityStyle(v || "Medium").color,
            fontWeight: "600",
            border: "none",
            borderRadius: "6px"
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

  return (
    <div className="page">


      <PageHeader
        title={
          isIssue
            ? (selectedProject ? `${selectedProject.name} — Issues` : "All Issues")
            : (selectedProject ? `${selectedProject.name} — Tasks` : "All Tasks")
        }
        buttonText={isIssue ? "+ Add Issue" : "+ Add Task"}
        onButtonClick={() => {
          const validStaff = getValidStaff();
          setForm({
            title: "",
            description: "",
            // ✅ Default: first project-assigned staff/manager
            assignedTo: validStaff.length > 0 ? validStaff[0]._id : "",
            status: statuses && statuses.length > 0 ? statuses[0]._id : "",
            project: selectedProject?._id || "",
            priority: "Medium",
            image: null,
            video: null,
            oldImage: "",
            oldVideo: "",
          });
          setEditId(null);
          setShowForm(true);
        }}
      />

      {/* ================= FORM ================= */}
      <FormModal
        show={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? (isIssue ? "Edit Issue" : "Edit Task") : (isIssue ? "Add Issue" : "Add Task")}
        onSave={save}
      >
        <input
          className="form-control"
          placeholder="Title"
          value={form.title || ""}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          style={{ marginBottom: "15px" }}
        />

        <div style={{ position: "relative", marginBottom: "15px" }}>
          <textarea
            className="form-control"
            placeholder="Description (type @ to mention a member)"
            value={form.description || ""}
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

        {/* STAFF */}
        <select
          className="form-control"
          value={form.assignedTo || ""}
          onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
          style={{ marginBottom: "15px" }}
        >
          <option value="">Select Staff</option>
          {getValidStaff().map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} {s.position || s.role?.name ? `(${s.position || s.role?.name})` : ""}
            </option>
          ))}
        </select>

        {/* STATUS */}
        <select
          className="form-control"
          value={form.status || ""}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          style={{ marginBottom: "15px" }}
        >
          <option value="">Select Status</option>
          {statuses.map((s) => (
            <option key={s._id || `status-${s.name}`} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* PRIORITY — only in Issue mode */}
        {isIssue && (
          <div style={{ marginBottom: "15px" }}>
            <label style={{ fontWeight: "600", display: "block", marginBottom: "6px", fontSize: "14px", color: "#333" }}>Priority</label>
            <select
              className="form-control"
              value={form.priority || "Medium"}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              style={{
                background: priorityStyle(form.priority || "Medium").bg,
                color: priorityStyle(form.priority || "Medium").color,
                fontWeight: "600"
              }}
            >
              {["Low", "Medium", "High", "Critical"].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}

        {/* IMAGE */}
        <div>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px", fontSize: "14px", color: "#333" }}>Upload Image:</label>
          <input
            type="file"
            accept="image/*"
            className="form-control"
            onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
            style={{ marginBottom: "15px" }}
          />
        </div>

        {form.oldImage && (
          <img
            src={`http://localhost:5000/uploads/${form.oldImage}`}
            width="120"
            alt=""
            style={{ marginBottom: "15px" }}
          />
        )}

        {/* VIDEO */}
        <div>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px", fontSize: "14px", color: "#333" }}>Upload Video:</label>
          <input
            type="file"
            accept="video/*"
            className="form-control"
            onChange={(e) => setForm({ ...form, video: e.target.files[0] })}
            style={{ marginBottom: "15px" }}
          />
        </div>

        {form.oldVideo && (
          <video
            src={`http://localhost:5000/uploads/${form.oldVideo}`}
            width="150"
            controls
            style={{ marginBottom: "15px" }}
          />
        )}
      </FormModal>

      {/* ================= TABLE ================= */}
      <DataTable
        data={tasks}
        columns={columns}
        onEdit={edit}
        onDelete={remove}
      />

      {tasks.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "40px",
          color: "#888",
          fontSize: "15px",
        }}>
          {selectedProject
            ? `No ${isIssue ? "issues" : "tasks"} found for "${selectedProject.name}". Click "+ Add ${isIssue ? "Issue" : "Task"}" to create one.`
            : `No ${isIssue ? "issues" : "tasks"} found. Click "+ Add ${isIssue ? "Issue" : "Task"}" to create one.`}

        </div>
      )}
    </div>
  );
}