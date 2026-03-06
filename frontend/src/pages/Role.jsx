import React, { useEffect, useState } from "react";
import "../style/main.css";
import DataTable from "../components/common/DataTable";
import FormModal from "../components/common/FormModal";
import PageHeader from "../components/common/PageHeader";
import API from "../api/api";

export default function Role() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    status: "Active",
    permissions: []
  });

  // LOAD ROLES
  const load = async () => {
    try {
      const res = await API.get("/roles");
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error loading roles:", error);
      setRoles([]);
    }
  };

  // LOAD PERMISSIONS
  const loadPermissions = async () => {
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
    loadPermissions();
  }, []);

  // SAVE
  const save = async () => {
    try {
      // LOG: Show what we're sending to backend
      console.log("=== SAVING ROLE ===");
      console.log("Role ID:", editId);
      console.log("Form data:", JSON.stringify(form, null, 2));

      if (editId) {
        await API.put(`/roles/${editId}`, form);
      } else {
        await API.post("/roles", form);
      }

      resetForm();
      setShowForm(false);
      load();
    } catch (error) {
      console.error("Error saving role:", error);
    }
  };

  // RESET FORM
  const resetForm = () => {
    setForm({
      name: "",
      status: "Active",
      permissions: []
    });
    setEditId(null);
  };

  // EDIT
  const edit = (item) => {
    // Convert old permission format to new format if needed
    const convertedPermissions = (item.permissions || []).map(perm => {
      if (perm.permissionId) {
        // Old format - need to convert to new format
        const permission = permissions.find(p => p._id === perm.permissionId);
        return {
          name: permission?.name || '',
          value: permission?.value || '',
          all: perm.all || false,
          create: perm.create || false,
          read: perm.read || false,
          update: perm.update || false,
          delete: perm.delete || false
        };
      }
      return perm; // Already in new format
    });

    setForm({
      name: item.name,
      status: item.status,
      permissions: convertedPermissions
    });
    setEditId(item._id);
    setShowForm(true);
  };

  // DELETE
  const remove = async (id) => {
    if (window.confirm("Are you sure you want to delete this role?")) {
      try {
        await API.delete(`/roles/${id}`);
        load();
      } catch (error) {
        console.error("Error deleting role:", error);
      }
    }
  };

  // HANDLE PERMISSION CHANGE
  const handlePermissionChange = (permissionId, action, value) => {
    const updatedPermissions = [...form.permissions];
    const permission = permissions.find(p => p._id === permissionId);
    if (!permission) return;

    const existingPermissionIndex = updatedPermissions.findIndex(
      p => p.value === permission.value
    );

    if (existingPermissionIndex >= 0) {
      // Update existing permission
      updatedPermissions[existingPermissionIndex] = {
        ...updatedPermissions[existingPermissionIndex],
        [action]: value
      };

      // If "all" is checked, check all other actions
      if (action === 'all' && value) {
        updatedPermissions[existingPermissionIndex] = {
          ...updatedPermissions[existingPermissionIndex],
          create: true,
          read: true,
          update: true,
          delete: true
        };
      } else if (action !== 'all' && !value) {
        // If any individual action is unchecked, uncheck "all"
        updatedPermissions[existingPermissionIndex].all = false;
      }
    } else {
      // Add new permission with name and value
      const newPermission = {
        name: permission.name,
        value: permission.value,
        all: false,
        create: false,
        read: false,
        update: false,
        delete: false
      };

      if (action === 'all' && value) {
        newPermission.all = true;
        newPermission.create = true;
        newPermission.read = true;
        newPermission.update = true;
        newPermission.delete = true;
      } else {
        newPermission[action] = value;
      }

      updatedPermissions.push(newPermission);
    }

    // LOG: Show permission change
    console.log(`=== PERMISSION CHANGED ===`);
    console.log(`Permission: ${permission.name} (${permission.value})`);
    console.log(`Action: ${action} = ${value}`);
    console.log(`Updated permissions:`, updatedPermissions);

    setForm({ ...form, permissions: updatedPermissions });
  };

  // TABLE COLUMNS
  const columns = [
    { header: "Name", key: "name" },
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
  ];

  return (
    <div className="page">
      <PageHeader
        title="Role Management"
        buttonText="+ Add Role"
        onButtonClick={() => setShowForm(true)}
      />

      {/* FORM MODAL */}
      <FormModal
        show={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        title={editId ? "Edit Role" : "Add Role"}
        onSave={save}
        saveText={editId ? "Update" : "Save"}
        maxWidth="800px"
      >
        <div style={{ display: 'flex', gap: '30px', marginBottom: '15px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label style={{ color: 'var(--text-muted)', marginBottom: '10px', fontSize: '14px', fontWeight: '800' }}>Role Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter role name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{
                padding: '14px 18px',
                border: 'none',
                borderRadius: '12px',
                background: 'var(--neu-bg)',
                boxShadow: 'var(--neu-shadow-sm)', // Changed to raised shadow
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label style={{ color: 'var(--text-muted)', marginBottom: '10px', fontSize: '14px', fontWeight: '800' }}>Status</label>
            <select
              className="form-control"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              style={{
                padding: '14px 18px',
                border: 'none',
                borderRadius: '12px',
                background: 'var(--neu-bg)',
                boxShadow: 'var(--neu-shadow-sm)', // Changed to raised shadow
                color: 'var(--text-main)',
                appearance: 'auto'
              }}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '30px' }}>
          <label style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '15px', display: 'block' }}>
            Permissions
          </label>
          <div className="permissions-table-container" style={{
            background: 'var(--neu-bg)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: 'var(--neu-shadow-sm)'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e2e8f0' }}>
                  <th style={{
                    padding: '18px 20px',
                    textAlign: 'left',
                    color: '#475569',
                    fontSize: '15px',
                    fontWeight: '800',
                    borderRight: '1px solid #f1f5f9'
                  }}>
                    Permission
                  </th>
                  <th style={{ padding: '18px 10px', textAlign: 'center', color: '#475569', fontSize: '15px', fontWeight: '800', borderRight: '1px solid #f1f5f9', width: '85px' }}>All</th>
                  <th style={{ padding: '18px 10px', textAlign: 'center', color: '#475569', fontSize: '15px', fontWeight: '800', borderRight: '1px solid #f1f5f9', width: '85px' }}>Read</th>
                  <th style={{ padding: '18px 10px', textAlign: 'center', color: '#475569', fontSize: '15px', fontWeight: '800', borderRight: '1px solid #f1f5f9', width: '85px' }}>Create</th>
                  <th style={{ padding: '18px 10px', textAlign: 'center', color: '#475569', fontSize: '15px', fontWeight: '800', borderRight: '1px solid #f1f5f9', width: '85px' }}>Update</th>
                  <th style={{ padding: '18px 10px', textAlign: 'center', color: '#475569', fontSize: '15px', fontWeight: '800', width: '85px' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map(permission => {
                  const currentPermission = form.permissions.find(p => p.value === permission.value);
                  return (
                    <tr key={permission._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{
                        padding: '16px 20px',
                        color: 'var(--text-main)',
                        fontWeight: '700',
                        fontSize: '14.5px',
                        borderRight: '1px solid #f1f5f9'
                      }}>
                        {permission.name}
                      </td>
                      <td style={{ padding: '16px 10px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                        <input
                          type="checkbox"
                          checked={currentPermission?.all || false}
                          onChange={(e) => handlePermissionChange(permission._id, 'all', e.target.checked)}
                          style={{
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            accentColor: '#2563eb'
                          }}
                        />
                      </td>
                      <td style={{ padding: '16px 10px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                        <input
                          type="checkbox"
                          checked={currentPermission?.read || false}
                          onChange={(e) => handlePermissionChange(permission._id, 'read', e.target.checked)}
                          style={{
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            accentColor: '#2563eb'
                          }}
                        />
                      </td>
                      <td style={{ padding: '16px 10px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                        <input
                          type="checkbox"
                          checked={currentPermission?.create || false}
                          onChange={(e) => handlePermissionChange(permission._id, 'create', e.target.checked)}
                          style={{
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            accentColor: '#2563eb'
                          }}
                        />
                      </td>
                      <td style={{ padding: '16px 10px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                        <input
                          type="checkbox"
                          checked={currentPermission?.update || false}
                          onChange={(e) => handlePermissionChange(permission._id, 'update', e.target.checked)}
                          style={{
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            accentColor: '#2563eb'
                          }}
                        />
                      </td>
                      <td style={{ padding: '16px 10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={currentPermission?.delete || false}
                          onChange={(e) => handlePermissionChange(permission._id, 'delete', e.target.checked)}
                          style={{
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            accentColor: '#2563eb'
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </FormModal>

      {/* DATA TABLE */}
      <DataTable
        data={roles}
        columns={columns}
        onEdit={edit}
        onDelete={remove}
      />
    </div>
  );
}
