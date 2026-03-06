import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/api';

const PermissionContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

export const PermissionProvider = ({ children }) => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPermissions = async () => {
    try {
      // Cookie handles auth automatically (withCredentials:true)
      const response = await API.get('/user-permissions');
      setPermissions(response.data || []);
    } catch {
      setPermissions([]); // Not logged in or error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const hasPermission = (permissionValue, action = 'read') => {
    if (loading) return false;

    const permission = permissions.find(p => p.value === permissionValue);
    if (!permission) return false;

    return permission.all || permission[action];
  };

  const hasAnyPermission = (permissionValues, action = 'read') => {
    if (loading) return false;

    return permissionValues.some(value => hasPermission(value, action));
  };

  const value = {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    refreshPermissions: loadPermissions
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};
