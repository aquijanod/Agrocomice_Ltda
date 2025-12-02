import React, { useEffect, useState } from 'react';
import { getUsers, saveUser, deleteUser, getRoles } from '../services/dataService';
import { User, RoleDef } from '../types';
import { Edit2, Trash2, Plus, X, Save, Eye } from 'lucide-react';
import { useAuth } from '../AuthContext';

const UsersPage: React.FC = () => {
  const { permissions } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [isViewMode, setIsViewMode] = useState(false);

  // Check specific permissions for this entity
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
    setEditingUser({ ...user, password: '' }); // Reset password field
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    if (!canCreate) return;
    setEditingUser({ name: '', email: '', role: 'Trabajador', avatar: `https://picsum.photos/20${Math.floor(Math.random()*90)}`, password: '' });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      await deleteUser(id);
      loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser.name && editingUser.email) {
      await saveUser(editingUser as User);
      setIsModalOpen(false);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Usuarios</h1>
            <p className="text-slate-500">Administra el acceso y la información del personal de la empresa.</p>
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
              <th className="p-4 font-semibold text-slate-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
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
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => handleView(user)} title="Ver" className="p-2 hover:bg-emerald-50 rounded text-slate-500 hover:text-emerald-600 transition-colors">
                    <Eye size={18} />
                  </button>
                  {canEdit && (
                    <button onClick={() => handleEdit(user)} title="Editar" className="p-2 hover:bg-blue-50 rounded text-slate-500 hover:text-blue-600 transition-colors">
                      <Edit2 size={18} />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDelete(user.id)} title="Eliminar" className="p-2 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  disabled={isViewMode}
                  value={editingUser.name || ''}
                  onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  disabled={isViewMode}
                  value={editingUser.email || ''}
                  onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

               {/* Password Field - Only show input in Edit/Create, hide in view */}
               {!isViewMode && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        {editingUser.id ? 'Nueva Contraseña (dejar en blanco para mantener)' : 'Contraseña'}
                    </label>
                    <input 
                        type="password" 
                        required={!editingUser.id} // Required only on create
                        value={editingUser.password || ''}
                        onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="••••••••"
                    />
                </div>
               )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select 
                  value={editingUser.role || ''}
                  disabled={isViewMode}
                  onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
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