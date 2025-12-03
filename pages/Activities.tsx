import React, { useEffect, useState } from 'react';
import { Activity, ActivityStatus, User } from '../types';
import { getActivities, saveActivity, deleteActivity, getUsers } from '../services/dataService';
import { Plus, Edit2, Trash2, X, Save, Paperclip, FileText, Calendar, CheckCircle2, Clock, AlertCircle, Ban, Eye } from 'lucide-react';
import { useAuth } from '../AuthContext';

const ActivitiesPage: React.FC = () => {
  const { permissions, user: currentUser } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false); // Estado para controlar modo lectura
  const [editingActivity, setEditingActivity] = useState<Partial<Activity>>({});
  
  const canCreate = permissions?.['Actividades']?.create;
  const canEdit = permissions?.['Actividades']?.edit;
  const canDelete = permissions?.['Actividades']?.delete;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [acts, usrs] = await Promise.all([getActivities(), getUsers()]);
    setActivities(acts);
    setUsers(usrs);
  };

  const handleNew = () => {
    if (!canCreate) return;
    setEditingActivity({
        name: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        description: '',
        status: 'Pendiente',
        assigneeId: currentUser?.id || '',
        attachments: []
    });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (act: Activity) => {
    if (!canEdit) return;
    setEditingActivity(JSON.parse(JSON.stringify(act)));
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (act: Activity) => {
    setEditingActivity(JSON.parse(JSON.stringify(act)));
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (confirm('¿Eliminar esta actividad?')) {
        await deleteActivity(id);
        loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingActivity.name && editingActivity.startDate) {
        await saveActivity(editingActivity as Activity);
        setIsModalOpen(false);
        loadData();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          Array.from(files).forEach((file: File) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  setEditingActivity(prev => ({
                      ...prev,
                      attachments: [...(prev.attachments || []), {
                          name: file.name,
                          type: file.type,
                          url: reader.result as string
                      }]
                  }));
              };
              reader.readAsDataURL(file);
          });
      }
  };

  const removeAttachment = (index: number) => {
      setEditingActivity(prev => ({
          ...prev,
          attachments: prev.attachments?.filter((_, i) => i !== index)
      }));
  };

  const getStatusColor = (status?: ActivityStatus) => {
      switch(status) {
          case 'Pendiente': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'En Progreso': return 'bg-orange-100 text-orange-700 border-orange-200';
          case 'Completada': return 'bg-green-100 text-green-700 border-green-200';
          case 'Cancelada': return 'bg-slate-100 text-slate-600 border-slate-200';
          default: return 'bg-gray-100 text-gray-700';
      }
  };

  const getStatusIcon = (status?: ActivityStatus) => {
      switch(status) {
          case 'Pendiente': return <Clock size={14}/>;
          case 'En Progreso': return <AlertCircle size={14}/>;
          case 'Completada': return <CheckCircle2 size={14}/>;
          case 'Cancelada': return <Ban size={14}/>;
          default: return null;
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Actividades y Tareas</h1>
            <p className="text-slate-500">Gestión operativa, asignaciones y registro de evidencia en terreno.</p>
        </div>
        {canCreate && (
          <button onClick={handleNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus size={18} /> Nueva Actividad
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
          {activities.map(act => {
              const assignee = users.find(u => u.id === act.assigneeId);
              return (
                  <div key={act.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between gap-4 hover:shadow-md transition-shadow">
                      <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between md:justify-start gap-4">
                            <h3 className="font-bold text-lg text-slate-800">{act.name}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 ${getStatusColor(act.status)}`}>
                                {getStatusIcon(act.status)} {act.status}
                            </span>
                          </div>
                          <p className="text-slate-600 text-sm line-clamp-2">{act.description}</p>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-2">
                              <div className="flex items-center gap-1">
                                  <Calendar size={14} className="text-slate-400"/>
                                  {act.startDate} <span className="mx-1">al</span> {act.endDate}
                              </div>
                              <div className="flex items-center gap-1">
                                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                      {assignee?.name.charAt(0)}
                                  </div>
                                  {assignee?.name || 'Sin asignar'}
                              </div>
                              {act.attachments.length > 0 && (
                                  <div className="flex items-center gap-1 text-blue-600">
                                      <Paperclip size={14} /> {act.attachments.length} adjunto(s)
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="flex items-center gap-2 border-t pt-4 md:border-t-0 md:pt-0 md:border-l md:pl-4 border-slate-100">
                          <button onClick={() => handleView(act)} title="Ver Detalle" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                              <Eye size={18} />
                          </button>
                          {canEdit && (
                              <button onClick={() => handleEdit(act)} title="Editar" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                  <Edit2 size={18} />
                              </button>
                          )}
                          {canDelete && (
                              <button onClick={() => handleDelete(act.id)} title="Eliminar" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 size={18} />
                              </button>
                          )}
                      </div>
                  </div>
              )
          })}
          {activities.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                  <FileText size={48} className="mx-auto mb-2 opacity-20"/>
                  <p>No hay actividades registradas.</p>
              </div>
          )}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-fade-in">
                  <div className="flex justify-between items-center p-6 border-b border-slate-100">
                      <h2 className="text-xl font-bold text-slate-800">
                          {isViewMode ? 'Detalle de Actividad' : (editingActivity.id ? 'Editar Actividad' : 'Nueva Actividad')}
                      </h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>

                  <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                      
                      {/* 1. Nombre */}
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Actividad</label>
                          <input 
                              type="text" required
                              disabled={isViewMode}
                              value={editingActivity.name}
                              onChange={e => setEditingActivity({...editingActivity, name: e.target.value})}
                              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                              placeholder="Ej: Mantenimiento Riego"
                          />
                      </div>

                      {/* 2. Descripción */}
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                          <textarea 
                              required
                              disabled={isViewMode}
                              value={editingActivity.description}
                              onChange={e => setEditingActivity({...editingActivity, description: e.target.value})}
                              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 disabled:bg-slate-100 disabled:text-slate-500"
                          />
                      </div>

                      {/* 3. Fechas */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
                              <input 
                                  type="date" required
                                  disabled={isViewMode}
                                  value={editingActivity.startDate}
                                  onChange={e => setEditingActivity({...editingActivity, startDate: e.target.value})}
                                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Término</label>
                              <input 
                                  type="date" required
                                  disabled={isViewMode}
                                  value={editingActivity.endDate}
                                  onChange={e => setEditingActivity({...editingActivity, endDate: e.target.value})}
                                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                              />
                          </div>
                      </div>

                      {/* 4. Encargado y Estado */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Encargado</label>
                              <select 
                                  value={editingActivity.assigneeId}
                                  disabled={isViewMode}
                                  onChange={e => setEditingActivity({...editingActivity, assigneeId: e.target.value})}
                                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                              >
                                  <option value="">Seleccionar...</option>
                                  {users.map(u => (
                                      <option key={u.id} value={u.id}>{u.name}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                              <select 
                                  value={editingActivity.status}
                                  disabled={isViewMode}
                                  onChange={e => setEditingActivity({...editingActivity, status: e.target.value as ActivityStatus})}
                                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                              >
                                  <option value="Pendiente">Pendiente</option>
                                  <option value="En Progreso">En Progreso</option>
                                  <option value="Completada">Completada</option>
                                  <option value="Cancelada">Cancelada</option>
                              </select>
                          </div>
                      </div>

                      {/* 5. Adjuntos */}
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Evidencia y Documentos</label>
                          
                          {!isViewMode && (
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                                <input 
                                    type="file" multiple 
                                    id="file-upload" 
                                    className="hidden" 
                                    onChange={handleFileUpload}
                                />
                                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                    <Paperclip className="text-slate-400" size={24} />
                                    <span className="text-blue-600 font-medium">Adjuntar archivos</span>
                                    <span className="text-xs text-slate-400">PDF, JPG, PNG (Max 5MB)</span>
                                </label>
                            </div>
                          )}
                          
                          {editingActivity.attachments && editingActivity.attachments.length > 0 ? (
                              <div className="mt-4 space-y-2">
                                  {editingActivity.attachments.map((file, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                                          <div className="flex items-center gap-2 truncate">
                                              <FileText size={16} className="text-slate-500" />
                                              <span className="truncate max-w-[300px]">{file.name}</span>
                                          </div>
                                          {!isViewMode && (
                                              <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-700">
                                                  <X size={16} />
                                              </button>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          ) : isViewMode && (
                              <div className="text-slate-400 text-sm italic p-2">Sin adjuntos</div>
                          )}
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

export default ActivitiesPage;