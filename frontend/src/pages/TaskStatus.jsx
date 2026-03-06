import React, { useEffect, useState } from "react";
import "../style/main.css";
import DataTable from "../components/common/DataTable";
import FormModal from "../components/common/FormModal";
import PageHeader from "../components/common/PageHeader";
import API from "../api/api";
import { getStatusBadgeClass, formatStatusText } from "../utils/statusHelper";
import { useProject } from "../contexts/ProjectContext";
import { SelectField, TextInput } from "../components/common/FormFields";

export default function TaskStatus() {
  const { selectedProject } = useProject();
  const [statuses, setStatuses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({
    name: "",
    status: "Active",
    project: "",
  });
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchStatus = async () => {
    const url = selectedProject ? `/task-status?project=${selectedProject._id}` : "/task-status";
    const res = await API.get(url);
    setStatuses(res.data);
  };

  const fetchProjects = async () => {
    const res = await API.get("/projects");
    setProjects(res.data || []);
  };

  useEffect(() => {
    fetchStatus();
    fetchProjects();
  }, [selectedProject]);

  const resetForm = () => {
    setForm({ name: "", status: "Active", project: selectedProject?._id || "" });
    setEditId(null);
  };

  const handleSave = async () => {
    if (editId) {
      await API.put(
        `/task-status/${editId}`,
        form
      );
    } else {
      await API.post("/task-status", form);
    }

    fetchStatus();
    resetForm();
    setShowModal(false);
  };

  const handleAddClick = () => {
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name,
      status: item.status,
      project: item.project?._id || item.project || "",
    });
    setEditId(item._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    await API.delete(`/task-status/${id}`);
    fetchStatus();
  };

  return (
    <div className="page">
      <PageHeader
        title={selectedProject ? `${selectedProject.name} — Task Status` : "Task Status"}
        buttonText="Add Status"
        onButtonClick={handleAddClick}
      />

      <FormModal
        show={showModal}
        onClose={handleCloseModal}
        title={editId ? "Edit Task Status" : "Add Task Status"}
        onSave={handleSave}
        saveText={editId ? "Update" : "Save"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <TextInput
            label="Status Name"
            type="text"
            placeholder="Status Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <SelectField
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Delete" },
            ]}
          />

          <SelectField
            label="Link to Project"
            value={form.project}
            onChange={(e) => setForm({ ...form, project: e.target.value })}
            options={[
              { value: "", label: "No Project (Global)" },
              ...projects.map(p => ({ value: p._id, label: p.name }))
            ]}
          />
        </form>
      </FormModal>

      <div style={{ marginTop: "20px" }}>
        <DataTable
          data={statuses}
          columns={[
            { key: "name", header: "Status Name" },
            {
              key: "status",
              header: "Status",
              render: (value) => (
                <span style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: "800",
                  background: value === "Active" ? "#dcfce7" : "#fee2e2",
                  color: value === "Active" ? "#16a34a" : "#dc2626",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  {value === "Inactive" ? "Delete" : value}
                </span>
              ),
            },
            {
              key: "project",
              header: "Project",
              render: (p) => p ? (
                <span style={{
                  padding: "4px 10px", borderRadius: "8px", fontSize: "11px",
                  fontWeight: "700", background: "var(--neu-bg)",
                  boxShadow: "var(--neu-shadow-sm)", color: "var(--primary-color)"
                }}>
                  {p.name || "Project"}
                </span>
              ) : <span style={{ color: "#aaa" }}>Global</span>
            },
          ]}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}