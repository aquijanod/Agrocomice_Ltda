import React, { useEffect, useState } from 'react';
import { MeterReading, User } from '../types';
import { getMeterReadings, saveMeterReading, deleteMeterReading, getUsers } from '../services/dataService';
import { Plus, Trash2, X, Save, Eye, Gauge, Droplets, Zap, Flame, Calendar, MapPin, User as UserIcon, Upload, ImageIcon, ZoomIn, Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { ConfirmModal, AlertModal } from '../components/Modals';

const MeterReadingsPage: React.FC = () => {
  const { permissions, user: currentUser } = useAuth();
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal de Edición/Creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingReading, setEditingReading] = useState<Partial<MeterReading>>({});
  
  // Estado de carga de imagen
  const [isCompressing, setIsCompressing] = useState(false);

  // Modal de Previsualización de Imagen
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filtros
  const [serviceFilter, setServiceFilter] = useState<string>('Todos');

  // Modals Alertas
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{isOpen: boolean, title: string, message: string, type: 'success'|'error'|'info'}>({
      isOpen: false, title: '', message: '', type: 'info'
  });

  const canCreate = permissions?.['Estado Medidores']?.create;
  const canDelete = permissions?.['Estado Medidores']?.delete;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const [data, usrs] = await Promise.all([getMeterReadings(), getUsers()]);
        // Asegurar ordenamiento DESC por fecha
        const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setReadings(sortedData);
        setUsers(usrs);
    } catch (error) {
        console.error("Error loading meter readings:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleNew = () => {
    if (!canCreate) return;
    setEditingReading({
        userId: currentUser?.id || '',
        date: new Date().toISOString().split('T')[0],
        location: 'Casa Grande',
        serviceType: 'Agua',
        photos: []
    });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (reading: MeterReading) => {
    setEditingReading(JSON.parse(JSON.stringify(reading)));
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  // --- LÓGICA DE ELIMINACIÓN ---
  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canDelete) {
        setAlertState({isOpen: true, title: 'Acceso Denegado', message: 'No tiene permisos para eliminar registros.', type: 'error'});
        return;
    }
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
        await deleteMeterReading(deleteId);
        setAlertState({
            isOpen: true, 
            title: 'Registro Eliminado', 
            message: 'El registro de medidor ha sido eliminado correctamente.', 
            type: 'success'
        });
        loadData();
    } catch (error) {
        console.error("Error al eliminar medidor:", error);
        setAlertState({
            isOpen: true,
            title: 'Error',
            message: 'No se pudo eliminar el registro. Intente nuevamente.',
            type: 'error'
        });
    } finally {
        setDeleteId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReading.date && editingReading.photos && editingReading.photos.length > 0) {
        try {
            await saveMeterReading(editingReading as MeterReading);
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error("Error al guardar medidor:", error);
            setAlertState({isOpen: true, title: 'Error', message: 'Error al guardar el registro.', type: 'error'});
        }
    } else if (!editingReading.photos || editingReading.photos.length === 0) {
        setAlertState({isOpen: true, title: 'Falta Foto', message: 'Debes subir al menos una foto del medidor.', type: 'error'});
    }
  };

  // --- FUNCIÓN DE COMPRESIÓN DE IMÁGENES ---
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200; // Reducir a un ancho razonable para pantallas
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                // Calcular nuevas dimensiones manteniendo aspecto
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Convertir a JPEG con calidad 0.7 (reduce drásticamente el tamaño vs PNG/Raw)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          setIsCompressing(true);
          try {
              const processedPhotos = [];
              for (let i = 0; i < files.length; i++) {
                  const file = files[i];
                  // Comprimir imagen antes de guardar
                  const compressedDataUrl = await compressImage(file);
                  processedPhotos.push({
                      name: file.name.replace(/\.[^/.]+$/, "") + ".jpg", // Forzar extensión jpg
                      type: 'image/jpeg',
                      url: compressedDataUrl
                  });
              }

              setEditingReading(prev => ({
                  ...prev,
                  photos: [...(prev.photos || []), ...processedPhotos]
              }));
          } catch (error) {
              console.error("Error procesando imagen", error);
              setAlertState({
                  isOpen: true, 
                  title: 'Error de Imagen', 
                  message: 'No se pudo procesar la imagen de la cámara. Intente nuevamente.', 
                  type: 'error'
              });
          } finally {
              setIsCompressing(false);
          }
      }
  };

  const removePhoto = (index: number) => {
      setEditingReading(prev => ({
          ...prev,
          photos: prev.photos?.filter((_, i) => i !== index)
      }));
  };

  const getUserName = (id: string) => {
      return users.find(u => u.id === id)?.name || 'Usuario desconocido';
  };

  const getServiceIcon = (type?: string) => {
      switch(type) {
          case 'Agua': return <Droplets size={16} className="text-blue-500" />;
          case 'Gas': return <Flame size={16} className="text-orange-500" />;
          case 'Luz': return <Zap size={16} className="text-yellow-500" />;
          default: return <Gauge size={16} className="text-slate-500" />;
      }
  };
  
  // Helper to format date dd-mm-yyyy
  const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
  };

  // --- ESTRUCTURA DE AGRUPAMIENTO ---
  const locations = ['Casa Grande', 'Casa Chica'];
  const services = ['Agua', 'Gas', 'Luz'];

  const getFilteredReadings = (location: string, service: string) => {
      return readings.filter(r => {
          const locMatch = r.location === location;
          const srvMatch = r.serviceType === service;
          
          // Si el filtro global está activo, respetarlo
          if (serviceFilter !== 'Todos' && r.serviceType !== serviceFilter) return false;

          return locMatch && srvMatch;
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                <Gauge className="text-slate-600" /> Estado de Medidores
            </h1>
            <p className="text-slate-500">Registro fotográfico histórico por ubicación y servicio.</p>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                 <span className="text-sm font-medium text-slate-600">Filtrar:</span>
                 <select 
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    className="outline-none text-sm font-bold text-slate-800 bg-transparent cursor-pointer"
                 >
                     <option value="Todos">Todos</option>
                     <option value="Agua">Agua</option>
                     <option value="Gas">Gas</option>
                     <option value="Luz">Luz</option>
                 </select>
             </div>
            {canCreate && (
            <button onClick={handleNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm">
                <Plus size={18} /> <span className="hidden sm:inline">Nuevo Registro</span>
            </button>
            )}
        </div>
      </div>

      {/* --- VISTA AGRUPADA --- */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center">
            <Loader2 size={40} className="animate-spin mb-4 text-blue-600" />
            <p>Cargando registros de medidores...</p>
        </div>
      ) : (
        <div className="space-y-12">
            {locations.map(location => {
                // Verificar si esta ubicación tiene datos visibles (para no renderizar secciones vacías si se filtra)
                const hasDataInLocation = services.some(srv => getFilteredReadings(location, srv).length > 0);
                if (!hasDataInLocation) return null;

                return (
                    <div key={location} className="animate-fade-in">
                        <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-300">
                            <MapPin className="text-slate-400" size={24} />
                            <h2 className="text-2xl font-bold text-slate-800">{location}</h2>
                        </div>

                        <div className="space-y-8 pl-4 border-l-2 border-slate-100">
                            {services.map(service => {
                                const items = getFilteredReadings(location, service);
                                if (items.length === 0) return null;

                                return (
                                    <div key={service}>
                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            {getServiceIcon(service)} {service} 
                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-normal border border-slate-200">{items.length}</span>
                                        </h3>
                                        
                                        {/* --- GRID DE TARJETAS --- */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                            {items.map(reading => (
                                                <div key={reading.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                                                    
                                                    {/* Imagen (Click para Preview) */}
                                                    <div className="h-32 bg-slate-100 relative overflow-hidden cursor-pointer" onClick={() => reading.photos?.[0] && setPreviewImage(reading.photos[0].url)}>
                                                        {reading.photos && reading.photos.length > 0 ? (
                                                            <>
                                                                <img src={reading.photos[0].url} alt="Lectura" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                    <ZoomIn className="text-white drop-shadow-md" size={24}/>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                <ImageIcon size={32} />
                                                            </div>
                                                        )}
                                                        
                                                        {/* Badge de Cantidad de Fotos */}
                                                        {reading.photos && reading.photos.length > 1 && (
                                                            <div className="absolute top-2 right-2 bg-black/60 text-white px-1.5 py-0.5 rounded text-[10px] backdrop-blur-sm flex items-center gap-1">
                                                                <ImageIcon size={10} /> +{reading.photos.length - 1}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Info Card */}
                                                    <div className="p-3 flex-1 flex flex-col justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                                                                <Calendar size={12} /> {formatDate(reading.date)}
                                                            </div>
                                                        </div>

                                                        <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between items-center">
                                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-500 shrink-0">
                                                                    {getUserName(reading.userId).charAt(0)}
                                                                </div>
                                                                <span className="truncate text-xs text-slate-600" title={getUserName(reading.userId)}>{getUserName(reading.userId)}</span>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => handleView(reading)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                                    <Eye size={16} />
                                                                </button>
                                                                {canDelete && (
                                                                    <button 
                                                                        onClick={(e) => handleDeleteClick(reading.id, e)} 
                                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {readings.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    <Gauge size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No se encontraron registros de medidores.</p>
                </div>
            )}
        </div>
      )}

      {/* --- MODALS --- */}

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar Registro?"
        message="¿Está seguro que desea eliminar este registro de medidor? Esta acción no se puede deshacer."
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

      {/* Edit/Create Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-fade-in">
                  <div className="flex justify-between items-center p-6 border-b border-slate-100">
                      <h2 className="text-xl font-bold text-slate-800">
                          {isViewMode ? 'Detalle Registro' : 'Nuevo Registro de Medidor'}
                      </h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>

                  <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                              <input 
                                  type="date" required disabled={isViewMode}
                                  value={editingReading.date}
                                  onChange={e => setEditingReading({...editingReading, date: e.target.value})}
                                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                              />
                          </div>

                           <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Reportado Por</label>
                              <div className="w-full p-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-600 flex items-center gap-2">
                                  <UserIcon size={16} />
                                  <span className="text-sm truncate">{getUserName(editingReading.userId!)}</span>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Lugar</label>
                              <select 
                                  required disabled={isViewMode}
                                  value={editingReading.location}
                                  onChange={e => setEditingReading({...editingReading, location: e.target.value as any})}
                                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                              >
                                  <option value="Casa Grande">Casa Grande</option>
                                  <option value="Casa Chica">Casa Chica</option>
                              </select>
                          </div>

                           <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Servicio</label>
                              <select 
                                  required disabled={isViewMode}
                                  value={editingReading.serviceType}
                                  onChange={e => setEditingReading({...editingReading, serviceType: e.target.value as any})}
                                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                              >
                                  <option value="Agua">Agua</option>
                                  <option value="Gas">Gas</option>
                                  <option value="Luz">Luz</option>
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Fotografías del Medidor</label>
                          {!isViewMode && (
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors mb-4 relative">
                                {isCompressing && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                                        <div className="flex flex-col items-center">
                                            <Loader2 className="animate-spin text-blue-600" size={32} />
                                            <span className="text-xs text-blue-600 font-bold mt-2">Optimizando imagen...</span>
                                        </div>
                                    </div>
                                )}
                                <input 
                                    type="file" multiple accept="image/*"
                                    capture="environment" 
                                    id="file-upload" 
                                    className="hidden" 
                                    onChange={handleFileUpload}
                                />
                                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                    <Upload className="text-slate-400" size={24} />
                                    <span className="text-blue-600 font-medium">Subir Foto o Tomar Cámara</span>
                                    <span className="text-xs text-slate-400">Se optimizará automáticamente</span>
                                </label>
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-2">
                                {editingReading.photos?.map((photo, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                                        <img 
                                            src={photo.url} 
                                            alt="Evidencia" 
                                            className="w-full h-full object-cover cursor-pointer" 
                                            onClick={() => setPreviewImage(photo.url)}
                                        />
                                        {!isViewMode && (
                                            <button 
                                                type="button" 
                                                onClick={() => removePhoto(idx)}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                          </div>
                          {editingReading.photos?.length === 0 && isViewMode && (
                              <p className="text-center text-sm text-slate-400 italic">No hay fotos adjuntas.</p>
                          )}
                      </div>
                  </form>

                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                          {isViewMode ? 'Cerrar' : 'Cancelar'}
                      </button>
                      {!isViewMode && (
                        <button type="button" onClick={(e) => handleSave(e as any)} disabled={isCompressing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
                            {isCompressing ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} Guardar
                        </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default MeterReadingsPage;