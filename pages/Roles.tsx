import React, { useEffect, useState } from 'react';
import { getRoles, saveRole, deleteRole, getPermissions } from '../services/dataService';
import { RoleDef, Permission } from '../types';
import { Shield, Plus, Edit2, Trash2, X, Save, Eye } from 'lucide-react';
import { useAuth } from '../AuthContext';

const RolesPage: React.FC = () => {
  const { permissions } = useAuth();
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [permsData, setPermsData] = useState<Permission[]>([]); // renamed to avoid conflict
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<RoleDef>>({});

  const canCreate = permissions?.['Roles']?.create;
  const canEdit = permissions?.['Roles']?.edit;
  const canDelete = permissions?.['Roles']?.delete;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    getRoles().then(setRoles);
    getPermissions().then(setPermsData);
  };

  const handleView = (role: RoleDef) => {
    setEditingRole(role);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleEdit = (role: RoleDef) => {
    if (!canEdit) return;
    setEditingRole(role);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    if (!canCreate) return;
    const defaultPermId = permsData.length > 0 ? permsData[0].id : '';
    setEditingRole({ name: '', description: '', permissionId: defaultPermId });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (window.confirm('¿Eliminar este rol? Esto podría afectar a los usuarios asignados.')) {
      await deleteRole(id);
      loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole.name && editingRole.permissionId) {
      await saveRole(editingRole as RoleDef);
      setIsModalOpen(false);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Roles del Sistema</h1>
        {canCreate && (
          <button onClick={handleNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus size={18} /> Nuevo Rol
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-600">Nombre del Rol</th>
              <th className="p-4 font-semibold text-slate-600">Descripción</th>
              <th className="p-4 font-semibold text-slate-600">Perfil de Permisos</th>
              <th className="p-4 font-semibold text-slate-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roles.map((role) => {
                const permName = permsData.find(p => p.id === role.permissionId)?.name || 'Sin Asignar';
                return (
                    <tr key={role.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                            <Shield size={18} />
                            </div>
                            <span className="font-bold text-slate-800">{role.name}</span>
                        </div>
                        </td>
                        <td className="p-4 text-slate-600">{role.description}</td>
                        <td className="p-4">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm border border-slate-200">
                                {permName}
                            </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                            <button onClick={() => handleView(role)} className="p-2 hover:bg-emerald-50 rounded text-slate-500 hover:text-emerald-600 transition-colors">
                                <Eye size={18} />
                            </button>
                            {canEdit && (
                              <button onClick={() => handleEdit(role)} className="p-2 hover:bg-blue-50 rounded text-slate-500 hover:text-blue-600 transition-colors">
                                  <Edit2 size={18} />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDelete(role.id)} className="p-2 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 transition-colors">
                                  <Trash2 size={18} />
                              </button>
                            )}
                        </td>
                    </tr>
                );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                  {isViewMode ? 'Detalle Rol' : (editingRole.id ? 'Editar Rol' : 'Nuevo Rol')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input 
                  type="text" 
                  required
                  disabled={isViewMode}
                  value={editingRole.name || ''}
                  onChange={e => setEditingRole({...editingRole, name: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea 
                  required
                  disabled={isViewMode}
                  value={editingRole.description || ''}
                  onChange={e => setEditingRole({...editingRole, description: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Asignar Permiso (Matriz)</label>
                <select 
                  required
                  disabled={isViewMode}
                  value={editingRole.permissionId || ''}
                  onChange={e => setEditingRole({...editingRole, permissionId: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                >
                    <option value="" disabled>Seleccione un perfil de permisos</option>
                    {permsData.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Los permisos se configuran en el módulo "Permisos".</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                  {isViewMode ? 'Cerrar' : 'Cancelar'}
                </button>
                {!isViewMode && (
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <Save size={18} /> Guardar
                    </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;