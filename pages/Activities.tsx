import React, { useEffect, useState } from 'react';
import { Activity, ActivityStatus, User } from '../types';
import { getActivitiesByRange, saveActivity, deleteActivity, getUsers } from '../services/dataService';
import { Plus, Edit2, Trash2, X, Save, Calendar, CheckCircle2, Clock, AlertCircle, Ban, Eye, ChevronLeft, ChevronRight, Upload, ImageIcon, ZoomIn, Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { ConfirmModal, AlertModal } from '../components/Modals';

const ActivitiesPage: React.FC = () => {
  const { permissions, user: currentUser } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Partial<Activity>>({});
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Nuevo estado para loading en cambio de mes
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Image Preview State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Modals
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{isOpen: boolean, title: string, message: string, type: 'success'|'error'|'info'}>({
      isOpen: false, title: '', message: '', type: 'info'
  });

  const canCreate = permissions?.['Actividades']?.create;
  const canEdit = permissions?.['Actividades']?.edit;
  const canDelete = permissions?.['Actividades']?.delete;

  useEffect(() => {
    // Carga inicial de usuarios
    getUsers().then(setUsers);
  }, []);

  // Efecto que se dispara al cambiar de mes para cargar actividades
  useEffect(() => {
    fetchMonthActivities();
  }, [currentMonth]);

  const fetchMonthActivities = async () => {
    setIsLoadingActivities(true);
    try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        // Primer día del mes
        const start = new Date(year, month, 1).toISOString().split('T')[0];
        // Último día del mes
        const end = new Date(year, month + 1, 0).toISOString().split('T')[0];

        const acts = await getActivitiesByRange(start, end);
        setActivities(acts);
    } catch (error) {
        console.error("Error fetching month activities:", error);
    } finally {
        setIsLoadingActivities(false);
    }
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); 
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
    setCurrentMonth(newDate);
    setSelectedDate(null);
  };

  const handleDayClick = (day: number) => {
      const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      if (selectedDate && newDate.getTime() === selectedDate.getTime()) {
          setSelectedDate(null);
      } else {
          setSelectedDate(newDate);
      }
  };

  const getActivitiesForDay = (day: number) => {
      const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().split('T')[0];
      return activities.filter(act => {
          // Filtro de Seguridad: Trabajador solo ve sus asignaciones
          if (currentUser?.role === 'Trabajador' && act.assigneeId !== currentUser.id) {
              return false;
          }
          return dateStr >= act.startDate && dateStr <= act.endDate;
      });
  };

  const getProcessedActivities = () => {
      let filtered = activities;

      // Si hay una fecha seleccionada, filtrar solo esa fecha
      if (selectedDate) {
          const dateStr = selectedDate.toISOString().split('T')[0];
          filtered = filtered.filter(act => dateStr >= act.startDate && dateStr <= act.endDate);
      } 
      // Si no hay fecha seleccionada, mostramos TODAS las actividades cargadas (que ya corresponden al mes actual)

      // Filtro de Seguridad: Trabajador solo ve sus asignaciones
      if (currentUser?.role === 'Trabajador') {
          filtered = filtered.filter(act => act.assigneeId === currentUser.id);
      }

      return filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const processedActivities = getProcessedActivities();

  const groupedActivities = {
      'Pendiente': processedActivities.filter(a => a.status === 'Pendiente'),
      'En Progreso': processedActivities.filter(a => a.status === 'En Progreso'),
      'Completada': processedActivities.filter(a => a.status === 'Completada'),
      'Cancelada': processedActivities.filter(a => a.status === 'Cancelada'),
  };

  const statusOrder: ActivityStatus[] = ['Pendiente', 'En Progreso', 'Completada', 'Cancelada'];

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

  // 1. Trigger
  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canDelete) {
        setAlertState({isOpen: true, title: 'Acceso Denegado', message: 'No tiene permisos para eliminar actividades.', type: 'error'});
        return;
    }
    setDeleteId(id);
  };

  // 2. Execute
  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
        await deleteActivity(deleteId);
        setAlertState({
            isOpen: true, 
            title: 'Actividad Eliminada', 
            message: 'La actividad ha sido eliminada correctamente.', 
            type: 'success'
        });
        fetchMonthActivities(); // Recargar datos del mes actual
    } catch (error) {
        console.error(error);
        setAlertState({
            isOpen: true,
            title: 'Error',
            message: 'No se pudo eliminar la actividad. Es posible que existan otros registros vinculados a ella.',
            type: 'error'
        });
    } finally {
        setDeleteId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingActivity.name && editingActivity.startDate) {
        try {
            await saveActivity(editingActivity as Activity);
            setIsModalOpen(false);
            fetchMonthActivities(); // Recargar datos del mes actual
        } catch (error) {
            setAlertState({isOpen: true, title: 'Error', message: 'Error al guardar la actividad.', type: 'error'});
        }
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

  const getStatusIcon = (status?: ActivityStatus) => {
      switch(status) {
          case 'Pendiente': return <Clock size={14}/>;
          case 'En Progreso': return <AlertCircle size={14}/>;
          case 'Completada': return <CheckCircle2 size={14}/>;
          case 'Cancelada': return <Ban size={14}/>;
          default: return null;
      }
  };

  const formatDate = (dateStr: string | undefined) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Actividades y Tareas</h1>
            <p className="text-slate-500">Gestión operativa y planificación.</p>
        </div>
        
        <div className="flex items-center gap-3">
            {canCreate && (
            <button onClick={handleNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm">
                <Plus size={18} /> <span className="hidden sm:inline">Nueva Actividad</span>
            </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 lg:order-last space-y-4">
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                         <button onClick={() => changeMonth(-1)} disabled={isLoadingActivities} className="p-1 hover:bg-white rounded-md transition-shadow text-slate-500 disabled:opacity-50"><ChevronLeft size={20}/></button>
                         <h3 className="font-bold text-slate-800 capitalize text-lg flex items-center gap-2">
                             {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                             {isLoadingActivities && <Loader2 className="animate-spin text-blue-500" size={16} />}
                         </h3>
                         <button onClick={() => changeMonth(1)} disabled={isLoadingActivities} className="p-1 hover:bg-white rounded-md transition-shadow text-slate-500 disabled:opacity-50"><ChevronRight size={20}/></button>
                    </div>
                    
                    <div className="p-4">
                        <div className="grid grid-cols-7 mb-2 text-center">
                             {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => (
                                 <span key={d} className="text-xs font-bold text-slate-400">{d}</span>
                             ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: startDay }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square"></div>
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const dayActivities = getActivitiesForDay(day);
                                const hasActivity = dayActivities.length > 0;
                                const isSelected = selectedDate && 
                                                   selectedDate.getDate() === day && 
                                                   selectedDate.getMonth() === currentMonth.getMonth();

                                let bgClass = 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent';
                                if (hasActivity) {
                                    if (dayActivities.some(a => a.status === 'En Progreso')) {
                                        bgClass = 'bg-orange-50 border border-orange-200 text-orange-700 font-bold';
                                    } else if (dayActivities.some(a => a.status === 'Pendiente')) {
                                        bgClass = 'bg-blue-50 border border-blue-200 text-blue-700 font-bold';
                                    } else if (dayActivities.some(a => a.status === 'Completada')) {
                                        bgClass = 'bg-green-50 border border-green-200 text-green-700 font-bold';
                                    }
                                }
                                const ringClass = isSelected ? 'ring-2 ring-blue-600 ring-offset-2 z-10' : '';

                                return (
                                    <button 
                                        key={day} 
                                        onClick={() => handleDayClick(day)}
                                        className={`aspect-square flex items-center justify-center rounded-lg transition-all text-sm ${bgClass} ${ringClass}`}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <div className="mt-6 flex flex-wrap gap-3 text-[10px] text-slate-500 justify-center border-t border-slate-100 pt-4">
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Pendiente</div>
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> En Progreso</div>
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Completada</div>
                        </div>
                    </div>
               </div>
          </div>

          <div className="lg:col-span-2">
              <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg text-sm text-blue-800 flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>
                        Viendo: <span className="font-bold capitalize">
                            {selectedDate 
                                ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) 
                                : currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                            }
                        </span>
                    </span>
                  </div>
                  {selectedDate && (
                      <button onClick={() => setSelectedDate(null)} className="text-xs bg-white px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 text-blue-600 font-medium flex items-center gap-1">
                          <X size={12}/> Ver todo el mes
                      </button>
                  )}
              </div>

              {isLoadingActivities ? (
                  <div className="py-20 text-center text-slate-400 flex flex-col items-center">
                      <Loader2 size={40} className="animate-spin mb-4 text-blue-600" />
                      <p>Cargando actividades del mes...</p>
                  </div>
              ) : (
                <div className="space-y-8">
                    {statusOrder.map(status => {
                        const items = groupedActivities[status];
                        if (items.length === 0) return null;

                        return (
                            <div key={status} className="animate-fade-in">
                                <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 
                                    ${status === 'Pendiente' ? 'text-blue-700' : 
                                    status === 'En Progreso' ? 'text-orange-700' :
                                    status === 'Completada' ? 'text-green-700' : 'text-slate-600'}
                                `}>
                                    {getStatusIcon(status)} 
                                    {status} 
                                    <span className="text-sm font-normal text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100 shadow-sm ml-2">
                                        {items.length}
                                    </span>
                                </h3>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    {items.map(act => {
                                        const assignee = users.find(u => u.id === act.assigneeId);
                                        return (
                                            <div key={act.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row justify-between gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                    status === 'Pendiente' ? 'bg-blue-500' : 
                                                    status === 'En Progreso' ? 'bg-orange-500' :
                                                    status === 'Completada' ? 'bg-green-500' : 'bg-slate-400'
                                                }`}></div>

                                                <div className="flex-1 space-y-2 pl-2">
                                                    <div className="flex items-start justify-between md:justify-start gap-4">
                                                        <h3 className="font-bold text-base text-slate-800">{act.name}</h3>
                                                    </div>
                                                    <p className="text-slate-600 text-sm line-clamp-2">{act.description}</p>
                                                    
                                                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2 items-center">
                                                        <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                            <Calendar size={12} className="text-slate-400"/>
                                                            <span className="font-medium text-slate-700">{formatDate(act.startDate)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                                {assignee?.name.charAt(0)}
                                                            </div>
                                                            {assignee?.name || 'Sin asignar'}
                                                        </div>
                                                        {act.attachments.length > 0 && (
                                                            <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                                <ImageIcon size={12} /> {act.attachments.length}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 border-t pt-3 md:border-t-0 md:pt-0 md:border-l md:pl-4 border-slate-100 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleView(act)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                                        <Eye size={18} />
                                                    </button>
                                                    {canEdit && (
                                                        <button onClick={() => handleEdit(act)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                            <Edit2 size={18} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button 
                                                            onClick={(e) => handleDeleteClick(act.id, e)} 
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Eliminar Actividad"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
              )}
          </div>
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar Actividad?"
        message="¿Está seguro que desea eliminar esta Actividad? Esta acción no se puede deshacer."
        confirmText="Eliminar"
      />

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

       {/* Image Preview Modal (Lightbox) */}
       {previewImage && (
          <div 
            className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setPreviewImage(null)}
          >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                  <X size={32} />
              </button>
              <img 
                src={previewImage} 
                alt="Vista Previa" 
                className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
                onClick={(e) => e.stopPropagation()} 
              />
          </div>
      )}

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
                      
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Actividad</label>
                          <input 
                              type="text" required disabled={isViewMode}
                              value={editingActivity.name}
                              onChange={e => setEditingActivity({...editingActivity, name: e.target.value})}
                              className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                              placeholder="Ej: Mantenimiento Riego"
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                          <textarea 
                              required disabled={isViewMode}
                              value={editingActivity.description}
                              onChange={e => setEditingActivity({...editingActivity, description: e.target.value})}
                              className="w-full p-2 border border-slate-300 rounded-lg outline-none h-24 focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
                              <input 
                                  type="date" required disabled={isViewMode}
                                  value={editingActivity.startDate}
                                  onChange={e => setEditingActivity({...editingActivity, startDate: e.target.value})}
                                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Término</label>
                              <input 
                                  type="date" required disabled={isViewMode}
                                  value={editingActivity.endDate}
                                  onChange={e => setEditingActivity({...editingActivity, endDate: e.target.value})}
                                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Encargado</label>
                              <select 
                                  value={editingActivity.assigneeId} disabled={isViewMode}
                                  onChange={e => setEditingActivity({...editingActivity, assigneeId: e.target.value})}
                                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
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
                                  value={editingActivity.status} disabled={isViewMode}
                                  onChange={e => setEditingActivity({...editingActivity, status: e.target.value as ActivityStatus})}
                                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                              >
                                  <option value="Pendiente">Pendiente</option>
                                  <option value="En Progreso">En Progreso</option>
                                  <option value="Completada">Completada</option>
                                  <option value="Cancelada">Cancelada</option>
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Evidencia Fotográfica</label>
                          {!isViewMode && (
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors mb-4 relative">
                                <input 
                                    type="file" multiple accept="image/*"
                                    id="file-upload" 
                                    className="hidden" 
                                    onChange={handleFileUpload}
                                />
                                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                    <Upload className="text-slate-400" size={24} />
                                    <span className="text-blue-600 font-medium">Adjuntar Fotos</span>
                                    <span className="text-xs text-slate-400">JPG, PNG (Max 5MB)</span>
                                </label>
                            </div>
                          )}
                          {editingActivity.attachments && editingActivity.attachments.length > 0 ? (
                              <div className="mt-4 grid grid-cols-3 gap-2">
                                  {editingActivity.attachments.map((file, idx) => (
                                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                                          <img 
                                            src={file.url} 
                                            alt={file.name} 
                                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                                            onClick={() => setPreviewImage(file.url)}
                                          />
                                           <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                                <ZoomIn className="text-white drop-shadow-md" size={24}/>
                                           </div>
                                          {!isViewMode && (
                                              <button 
                                                type="button" 
                                                onClick={() => removeAttachment(idx)} 
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                              >
                                                  <X size={12} />
                                              </button>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          ) : isViewMode && (
                              <div className="text-slate-400 text-sm italic p-2 flex items-center gap-2">
                                <ImageIcon size={16} /> Sin fotografías adjuntas
                              </div>
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