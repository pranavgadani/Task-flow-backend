import React, { useEffect, useState } from "react";
import "../style/main.css";
import DataTable from "../components/common/DataTable";
import FormModal from "../components/common/FormModal";
import PageHeader from "../components/common/PageHeader";
import API from "../api/api";
import { TextInput } from "../components/common/FormFields";

export default function Permission() {
  const [permissions, setPermissions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    value: "",
  });

  // Generate value from name (convert to lowercase with underscores)
  const generateValue = (name) => {
    return name.toLowerCase().replace(/\s+/g, '_');
  };

  // LOAD PERMISSIONS
  const load = async () => {
    try {
      const res = await API.get("/permissions");
      setPermissions(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error loading permissions:", error);
      setPermissions([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // SAVE
  const save = async () => {
    try {
      if (editId) {
        await API.put(`/permissions/${editId}`, form);
      } else {
        await API.post("/permissions", form);
      }

      resetForm();
      setShowForm(false);
      load();
    } catch (error) {
      console.error("Error saving permission:", error);
    }
  };

  // RESET FORM
  const resetForm = () => {
    setForm({
      name: "",
      value: "",
    });
    setEditId(null);
  };

  // EDIT
  const edit = (item) => {
    setForm({
      name: item.name,
      value: item.value,
    });
    setEditId(item._id);
    setShowForm(true);
  };

  // DELETE
  const remove = async (id) => {
    if (window.confirm("Are you sure you want to delete this permission?")) {
      try {
        await API.delete(`/permissions/${id}`);
        load();
      } catch (error) {
        console.error("Error deleting permission:", error);
      }
    }
  };

  // Handle name change and auto-generate value
  const handleNameChange = (e) => {
    const name = e.target.value;
    const value = generateValue(name);
    setForm({
      ...form,
      name: name,
      value: value,
    });
  };

  // TABLE COLUMNS
  const columns = [
    { header: "Name", key: "name" },
    { header: "Value", key: "value" },
  ];

  return (
    <div className="page">
      <PageHeader 
        title="Permission Management" 
        buttonText="+ Add Permission" 
        onButtonClick={() => setShowForm(true)} 
      />

      {/* FORM MODAL */}
      <FormModal
        show={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        title={editId ? "Edit Permission" : "Add Permission"}
        onSave={save}
        saveText={editId ? "Update" : "Save"}
      >
        <TextInput
          label="Permission Name"
          type="text"
          placeholder="Enter permission name (e.g., User Create)"
          value={form.name}
          onChange={handleNameChange}
        />

        <TextInput
          label="Permission Value"
          type="text"
          placeholder="Auto-generated value"
          value={form.value}
          readOnly
          style={{ backgroundColor: "#f8f9fa" }}
          hint="Automatically generated from name (lowercase with underscores)"
        />
      </FormModal>

      {/* DATA TABLE */}
      <DataTable 
        data={permissions}
        columns={columns}
        onEdit={edit}
        onDelete={remove}
      />
    </div>
  );
}
