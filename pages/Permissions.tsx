import React, { useEffect, useState } from 'react';
import { getPermissions, savePermission, deletePermission } from '../services/dataService';
import { Permission, APP_ENTITIES } from '../types';
import { Key, Plus, Edit2, Trash2, X, Save, Eye } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { ConfirmModal, AlertModal } from '../components/Modals';

const PermissionsPage: React.FC = () => {
  const { permissions } = useAuth();
  const [perms, setPerms] = useState<Permission[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Partial<Permission>>({});
  
  // Modals
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{isOpen: boolean, title: string, message: string, type: 'success'|'error'|'info'}>({
      isOpen: false, title: '', message: '', type: 'info'
  });

  const canCreate = permissions?.['Permisos']?.create;
  const canEdit = permissions?.['Permisos']?.edit;
  const canDelete = permissions?.['Permisos']?.delete;

  const defaultMatrix = () => {
    const m: any = {};
    APP_ENTITIES.forEach(e => m[e] = { view: false, create: false, edit: false, delete: false });
    return m;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    getPermissions().then(setPerms);
  };

  const handleView = (perm: Permission) => {
    setEditingPerm(JSON.parse(JSON.stringify(perm)));
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleEdit = (perm: Permission) => {
    if (!canEdit) return;
    setEditingPerm(JSON.parse(JSON.stringify(perm)));
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    if (!canCreate) return;
    setEditingPerm({ name: '', description: '', matrix: defaultMatrix() });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  // 1. Trigger
  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canDelete) {
        setAlertState({isOpen: true, title: 'Acceso Denegado', message: 'No tiene permisos para eliminar perfiles.', type: 'error'});
        return;
    }
    setDeleteId(id);
  };

  // 2. Execute
  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      await deletePermission(deleteId);
      setAlertState({
          isOpen: true, 
          title: 'Perfil Eliminado', 
          message: 'Perfil de permisos eliminado correctamente.', 
          type: 'success'
      });
      loadData();
    } catch (error: any) {
      console.error("Error al eliminar permiso:", error);
      if (error?.code === '23503' || JSON.stringify(error).includes('violates foreign key constraint')) {
          setAlertState({
              isOpen: true,
              title: 'No se pudo eliminar',
              message: 'Este perfil está asignado a uno o más Roles.\n\nDebe asignar otro perfil a esos roles antes de eliminar este.',
              type: 'error'
          });
      } else {
          setAlertState({
              isOpen: true,
              title: 'Error',
              message: 'Ocurrió un error inesperado al eliminar el permiso.',
              type: 'error'
          });
      }
    } finally {
        setDeleteId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPerm.name && editingPerm.matrix) {
      try {
        await savePermission(editingPerm as Permission);
        setIsModalOpen(false);
        loadData();
      } catch (error) {
        console.error("Error saving permission:", error);
        setAlertState({isOpen: true, title: 'Error', message: 'No se pudo guardar el perfil.', type: 'error'});
      }
    }
  };

  const toggleMatrix = (entity: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    if (isViewMode) return;
    setEditingPerm(prev => {
        const newMatrix = { ...prev.matrix };
        if (!newMatrix[entity]) {
            newMatrix[entity] = { view: false, create: false, edit: false, delete: false };
        }
        newMatrix[entity] = { ...newMatrix[entity], [action]: !newMatrix[entity][action] };
        return { ...prev, matrix: newMatrix };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Perfiles de Permisos</h1>
            <p className="text-slate-500">Configura matrices de acceso granular por entidad.</p>
        </div>
        {canCreate && (
          <button onClick={handleNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus size={18} /> Nuevo Perfil
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-600">Nombre del Perfil</th>
              <th className="p-4 font-semibold text-slate-600">Descripción</th>
              <th className="p-4 font-semibold text-slate-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {perms.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                      <Key size={18} />
                    </div>
                    <span className="font-bold text-slate-800">{p.name}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-600">{p.description}</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => handleView(p)} className="p-2 hover:bg-emerald-50 rounded text-slate-500 hover:text-emerald-600 transition-colors">
                    <Eye size={18} />
                  </button>
                  {canEdit && (
                    <button onClick={() => handleEdit(p)} className="p-2 hover:bg-blue-50 rounded text-slate-500 hover:text-blue-600 transition-colors">
                      <Edit2 size={18} />
                    </button>
                  )}
                  {canDelete && (
                    <button 
                        onClick={(e) => handleDeleteClick(p.id, e)} 
                        className="p-2 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 transition-colors"
                        title="Eliminar Perfil"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar Perfil?"
        message="¿Está seguro que desea eliminar este Perfil de Permisos? Esta acción no se puede deshacer."
        confirmText="Eliminar Perfil"
      />

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

       {isModalOpen && editingPerm.matrix && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-fade-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                  {isViewMode ? 'Ver Permisos' : (editingPerm.id ? 'Editar Permisos' : 'Nuevo Perfil de Permisos')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Perfil</label>
                    <input 
                        type="text" required disabled={isViewMode}
                        value={editingPerm.name || ''}
                        onChange={e => setEditingPerm({...editingPerm, name: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                    <input 
                        type="text" required disabled={isViewMode}
                        value={editingPerm.description || ''}
                        onChange={e => setEditingPerm({...editingPerm, description: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 p-3 grid grid-cols-5 text-sm font-bold text-slate-700">
                    <div className="col-span-1">Entidad</div>
                    <div className="text-center">Ver</div>
                    <div className="text-center">Crear</div>
                    <div className="text-center">Editar</div>
                    <div className="text-center">Eliminar</div>
                </div>
                <div className="divide-y divide-slate-100">
                    {APP_ENTITIES.map(entity => (
                        <div key={entity} className="p-3 grid grid-cols-5 items-center hover:bg-slate-50">
                            <div className="col-span-1 font-medium text-slate-700 text-sm">{entity}</div>
                            {['view', 'create', 'edit', 'delete'].map((action) => (
                                <div key={action} className="flex justify-center">
                                    <input 
                                        type="checkbox"
                                        disabled={isViewMode}
                                        checked={editingPerm.matrix?.[entity]?.[action as 'view'|'create'|'edit'|'delete'] || false}
                                        onChange={() => toggleMatrix(entity, action as any)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                  {isViewMode ? 'Cerrar' : 'Cancelar'}
                </button>
                {!isViewMode && (
                    <button type="button" onClick={(e) => handleSave(e as any)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <Save size={18} /> Guardar
                    </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsPage;