import React, { useEffect, useState } from 'react';
import { getUsers, saveUser, deleteUser, getRoles } from '../services/dataService';
import { User, RoleDef } from '../types';
import { Edit2, Trash2, Plus, X, Save, Eye, Upload, Image as ImageIcon, Power } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { ConfirmModal, AlertModal } from '../components/Modals';

const UsersPage: React.FC = () => {
  const { permissions } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [isViewMode, setIsViewMode] = useState(false);

  // States for Custom Modals
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{isOpen: boolean, title: string, message: string, type: 'success'|'error'|'info'}>({
      isOpen: false, title: '', message: '', type: 'info'
  });

  const canCreate = permissions?.['Usuarios']?.create;
  const canEdit = permissions?.['Usuarios']?.edit;
  const canDelete = permissions?.['Usuarios']?.delete;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    getUsers().then(setUsers);
    getRoles().then(setRoles);
  };

  const handleView = (user: User) => {
    setEditingUser(user);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    if (!canEdit) return;
    setEditingUser({ ...user, password: '' });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    if (!canCreate) return;
    setEditingUser({ name: '', email: '', role: 'Trabajador', avatar: '', password: '', active: true });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  // 1. Trigger Delete (Opens Confirm Modal)
  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canDelete) {
        setAlertState({isOpen: true, title: 'Acceso Denegado', message: 'No tiene permisos para eliminar usuarios.', type: 'error'});
        return;
    }
    setDeleteId(id);
  };

  // 2. Execute Delete (Called by Modal) - LOGIC DELETE
  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
        await deleteUser(deleteId);
        setAlertState({
            isOpen: true, 
            title: 'Usuario Desactivado', 
            message: 'El usuario ha sido desactivado correctamente. No podrá ingresar al sistema hasta que sea reactivado.', 
            type: 'success'
        });
        loadData();
    } catch (error: any) {
        console.error("Error al eliminar:", error);
        setAlertState({
            isOpen: true,
            title: 'Error del Sistema',
            message: 'Ocurrió un error inesperado al intentar desactivar el usuario.',
            type: 'error'
        });
    } finally {
        setDeleteId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser.name && editingUser.email) {
      try {
        await saveUser(editingUser as User);
        setIsModalOpen(false);
        loadData();
      } catch (error) {
        setAlertState({isOpen: true, title: 'Error', message: 'No se pudo guardar el usuario.', type: 'error'});
      }
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { 
            setAlertState({isOpen: true, title: 'Archivo muy pesado', message: 'La imagen no debe superar los 5MB.', type: 'error'});
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditingUser(prev => ({ ...prev, avatar: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const UserAvatar = ({ user, size = 'sm' }: { user: Partial<User>, size?: 'sm' | 'lg' }) => {
      const dim = size === 'sm' ? 'w-10 h-10 text-sm' : 'w-32 h-32 text-4xl';
      if (user.avatar) {
        return <img src={user.avatar} alt={user.name} className={`${dim} rounded-full object-cover border border-slate-200 bg-white`} />;
      }
      return (
        <div className={`${dim} rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold border border-indigo-200 select-none`}>
          {user.name ? user.name.charAt(0).toUpperCase() : '?'}
        </div>
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Usuarios</h1>
            <p className="text-slate-500">Administra el acceso y la información del personal.</p>
        </div>
        {canCreate && (
          <button onClick={handleNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors">
            <Plus size={18} /> Nuevo Usuario
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-600">Usuario</th>
              <th className="p-4 font-semibold text-slate-600">Email</th>
              <th className="p-4 font-semibold text-slate-600">Rol</th>
              <th className="p-4 font-semibold text-slate-600">Estado</th>
              <th className="p-4 font-semibold text-slate-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${!user.active ? 'opacity-60 bg-slate-50/50' : ''}`}>
                <td className="p-4 flex items-center gap-3">
                  <UserAvatar user={user} size="sm" />
                  <span className="font-medium text-slate-800">{user.name}</span>
                </td>
                <td className="p-4 text-slate-600">{user.email}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border
                    ${user.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                      user.role === 'Supervisor' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                      'bg-green-50 text-green-700 border-green-200'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4">
                     {user.active ? (
                         <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                             <span className="w-2 h-2 bg-green-500 rounded-full"></span> Activo
                         </span>
                     ) : (
                         <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                             <span className="w-2 h-2 bg-slate-400 rounded-full"></span> Inactivo
                         </span>
                     )}
                </td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => handleView(user)} className="p-2 hover:bg-emerald-50 rounded text-slate-500 hover:text-emerald-600 transition-colors">
                    <Eye size={18} />
                  </button>
                  {canEdit && (
                    <button onClick={() => handleEdit(user)} className="p-2 hover:bg-blue-50 rounded text-slate-500 hover:text-blue-600 transition-colors">
                      <Edit2 size={18} />
                    </button>
                  )}
                  {canDelete && user.active && (
                    <button 
                        onClick={(e) => handleDeleteClick(user.id, e)} 
                        className="p-2 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 transition-colors"
                        title="Desactivar Usuario"
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

      {/* MODALS */}
      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="¿Desactivar Usuario?"
        message="¿Está seguro que desea desactivar este usuario? No podrá iniciar sesión en el sistema, pero sus registros históricos se mantendrán."
        confirmText="Sí, Desactivar"
        isDestructive={true}
      />

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

      {/* EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {isViewMode ? 'Detalles de Usuario' : (editingUser.id ? 'Editar Usuario' : 'Nuevo Usuario')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex flex-col items-center gap-4 py-4 border-b border-slate-100 mb-4">
                 <UserAvatar user={editingUser} size="lg" />
                 {!isViewMode && (
                     <div className="flex gap-2">
                        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            <Upload size={16} /> Subir Foto
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                        {editingUser.avatar && (
                            <button 
                                type="button"
                                onClick={() => setEditingUser(prev => ({...prev, avatar: ''}))}
                                className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={16} /> Eliminar
                            </button>
                        )}
                     </div>
                 )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                    <input 
                      type="text" required disabled={isViewMode}
                      value={editingUser.name || ''}
                      onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <div className="flex items-center gap-2 mt-2">
                         <button 
                             type="button"
                             disabled={isViewMode}
                             onClick={() => setEditingUser(prev => ({...prev, active: !prev.active}))}
                             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editingUser.active ? 'bg-green-500' : 'bg-slate-300'} ${isViewMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                         >
                             <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editingUser.active ? 'translate-x-6' : 'translate-x-1'}`} />
                         </button>
                         <span className="text-sm text-slate-600 font-medium">
                             {editingUser.active ? 'Activo' : 'Inactivo'}
                         </span>
                    </div>
                  </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="email" required disabled={isViewMode}
                  value={editingUser.email || ''}
                  onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>

               {!isViewMode && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        {editingUser.id ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
                    </label>
                    <input 
                        type="password" required={!editingUser.id}
                        value={editingUser.password || ''}
                        onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                    />
                </div>
               )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select 
                  value={editingUser.role || ''} disabled={isViewMode}
                  onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
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

export default UsersPage;