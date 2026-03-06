import React, { useEffect, useState } from "react";
import "../style/main.css";
import DataTable from "../components/common/DataTable";
import FormModal from "../components/common/FormModal";
import PageHeader from "../components/common/PageHeader";
import ProtectedRoute from "../components/ProtectedRoute";
import API from "../api/api";
import { SelectField, TextInput } from "../components/common/FormFields";

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    status: "Active",
    role: "",
  });

  // LOAD STAFF
  const load = async () => {
    const res = await API.get("/staff");
    setStaff(res.data.staff || res.data);
  };

  // LOAD ROLES
  const loadRoles = async () => {
    const res = await API.get("/roles");
    setRoles(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    load();
    loadRoles();
  }, []);

  // SAVE
  const save = async () => {
    if (editId) {
      await API.put(
        `/staff/${editId}`,
        form
      );
    } else {
      await API.post(
        "/staff",
        form
      );
    }

    resetForm();
    setShowForm(false);
    load();
  };

  // RESET FORM
  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      phone: "",
      status: "Active",
      role: "",
    });
    setEditId(null);
  };

  // EDIT
  const edit = (item) => {
    setForm({
      ...item,
      role: item.role ? item.role._id : ""
    });
    setEditId(item._id);
    setShowForm(true);
  };

  // DELETE
  const remove = async (id) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      await API.delete(`/staff/${id}`);
      load();
    }
  };

  // TABLE COLUMNS
  const columns = [
    { header: "Name", key: "name" },
    { header: "Email", key: "email" },
    { header: "Phone", key: "phone" },
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
    { header: "Role", key: "role" },
  ];

  return (
    <div className="page">
      <ProtectedRoute permissionValue="staff_management" action="create">
        <PageHeader
          title="Staff Management"
          buttonText="+ Add Staff"
          onButtonClick={() => setShowForm(true)}
        />
      </ProtectedRoute>

      {/* FORM MODAL */}
      <ProtectedRoute permissionValue="staff_management" action="create">
        <FormModal
          show={showForm}
          onClose={() => {
            setShowForm(false);
            resetForm();
          }}
          title={editId ? "Edit Staff" : "Add Staff"}
          onSave={save}
          saveText={editId ? "Update" : "Save"}
        >
          <TextInput
            label="Name"
            type="text"
            placeholder="Enter name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <TextInput
            label="Email"
            type="email"
            placeholder="Enter email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <TextInput
            label="Phone"
            type="text"
            placeholder="Enter phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <SelectField
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
          />

          <SelectField
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="">Select a Role</option>
            {roles.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </SelectField>
        </FormModal>
      </ProtectedRoute>

      {/* DATA TABLE */}
      <ProtectedRoute permissionValue="staff_management" action="read">
        <DataTable
          data={staff}
          columns={columns}
          onEdit={edit}
          onDelete={remove}
        />
      </ProtectedRoute>
    </div>
  );
}