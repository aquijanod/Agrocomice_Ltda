import React, { useEffect, useState, useRef } from 'react';
import { MeterReading, User } from '../types';
import { getPaginatedMeterReadings, saveMeterReading, deleteMeterReading, getUsers } from '../services/dataService';
import { Plus, Trash2, X, Save, Eye, Gauge, Droplets, Zap, Flame, Calendar, MapPin, User as UserIcon, Upload, ImageIcon, ZoomIn, Loader2, Fuel, TreePine, ChevronRight, ChevronLeft, MessageSquare } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { ConfirmModal, AlertModal } from '../components/Modals';

// --- SUB-COMPONENT: Service Section (Carrusel Paginado) ---
interface ServiceSectionProps {
    location: string;
    service: string;
    users: User[];
    refreshTrigger: number;
    canDelete: boolean;
    onView: (r: MeterReading) => void;
    onDelete: (id: string) => void;
    onImageClick: (url: string) => void; // Nuevo prop para manejar click en imagen
    filterActive: boolean;
}

const ServiceSection: React.FC<ServiceSectionProps> = ({ 
    location, service, users, refreshTrigger, canDelete, onView, onDelete, onImageClick, filterActive 
}) => {
    const [readings, setReadings] = useState<MeterReading[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 3; 
    
    // Ref para controlar el scroll del contenedor
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Si cambia el trigger, recargamos la página 0
    useEffect(() => {
        loadPage(0);
    }, [refreshTrigger, location, service]);

    const loadPage = async (pageIndex: number) => {
        setLoading(true);
        // Solicitamos PAGE_SIZE + 1 para saber si hay más páginas
        const from = pageIndex * PAGE_SIZE;
        const to = from + PAGE_SIZE; 
        
        try {
            const data = await getPaginatedMeterReadings(location, service, from, to);
            
            // Si recibimos más de PAGE_SIZE, hay página siguiente
            const hasNext = data.length > PAGE_SIZE;
            // Solo mostramos los primeros PAGE_SIZE
            const displayData = hasNext ? data.slice(0, PAGE_SIZE) : data;
            
            setReadings(displayData);
            setHasMore(hasNext);
            setPage(pageIndex);
            
            // Resetear scroll visualmente al inicio en desktop
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({ left: 0, behavior: 'auto' });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => loadPage(page + 1);
    const handlePrev = () => loadPage(page - 1);

    const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Usuario desconocido';

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return dateStr;
    };

    const getServiceIcon = (type?: string) => {
        switch(type) {
            case 'Agua': return <Droplets size={16} className="text-blue-500" />;
            case 'Gas': return <Flame size={16} className="text-orange-500" />;
            case 'Luz': return <Zap size={16} className="text-yellow-500" />;
            case 'Leña': return <TreePine size={16} className="text-amber-700" />;
            case 'Bencina Maquinas': return <Fuel size={16} className="text-red-500" />;
            default: return <Gauge size={16} className="text-slate-500" />;
        }
    };

    if (filterActive && readings.length === 0 && !loading) return null;
    if (readings.length === 0 && !loading && page === 0) return null;

    return (
        <div className="mb-8 w-full min-w-0">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2 px-1">
                {getServiceIcon(service)} {service} 
                {readings.length > 0 && (
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-normal border border-slate-200">
                    Página {page + 1}
                    </span>
                )}
            </h3>

            {/* Container Responsivo: Flex Column en móvil, Flex Row con scroll en Desktop */}
            <div className="relative w-full min-w-0">
                <div 
                    ref={scrollContainerRef}
                    className="flex flex-col md:flex-row gap-4 md:overflow-x-auto pb-4 px-1 md:snap-x md:snap-mandatory items-center w-full touch-pan-x"
                    style={{ 
                        scrollbarWidth: 'none', 
                        msOverflowStyle: 'none', 
                    }}
                >
                    <style>{`
                        div::-webkit-scrollbar { display: none; }
                    `}</style>

                    {/* BOTÓN ANTERIOR */}
                    {page > 0 && (
                        <div className="w-full md:min-w-[80px] md:w-auto flex items-center justify-center snap-start h-12 md:h-[280px]">
                            <button 
                                onClick={handlePrev}
                                disabled={loading}
                                className="flex flex-row md:flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-600 transition-all p-2 rounded-xl hover:bg-blue-50 h-full w-full border border-dashed border-slate-300 hover:border-blue-200 group"
                                title="Página Anterior"
                            >
                                <div className="p-1 md:p-3 bg-slate-100 rounded-full group-hover:bg-blue-100 transition-colors">
                                    <ChevronLeft size={20} />
                                </div>
                                <span className="text-xs md:text-[10px] font-bold text-center leading-tight uppercase tracking-wide">Anterior</span>
                            </button>
                        </div>
                    )}

                    {readings.map(reading => (
                        // Card Responsiva: Horizontal en Móvil, Vertical en Desktop. Altura autoajustable.
                        <div key={reading.id} className="w-full md:min-w-[240px] md:w-[240px] snap-start bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-row md:flex-col min-h-[8rem] md:min-h-[280px] h-auto">
                            
                            {/* Imagen */}
                            <div 
                                className="w-32 md:w-full min-h-full md:min-h-0 md:h-40 bg-slate-100 relative overflow-hidden cursor-pointer shrink-0" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (reading.photos && reading.photos.length > 0) {
                                        onImageClick(reading.photos[0].url);
                                    } else {
                                        onView(reading);
                                    }
                                }}
                            >
                                {reading.photos && reading.photos.length > 0 ? (
                                    <>
                                        <img src={reading.photos[0].url} alt="Lectura" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                        {reading.photos.length > 1 && (
                                            <div className="absolute top-2 right-2 bg-black/60 text-white px-1.5 py-0.5 rounded text-[10px] backdrop-blur-sm flex items-center gap-1">
                                                <ImageIcon size={10} /> +{reading.photos.length - 1}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <ImageIcon size={32} />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                                        <Calendar size={12} /> {formatDate(reading.date)}
                                    </div>
                                    
                                    {/* Comentario en la tarjeta - Autoajustable */}
                                    {reading.comments && (
                                        <div className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-100 mb-1" title={reading.comments}>
                                            {reading.comments}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="border-t border-slate-100 pt-2 mt-auto flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500 shrink-0 border border-slate-200">
                                            {getUserName(reading.userId).charAt(0)}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="truncate text-xs font-medium text-slate-700 max-w-[80px]" title={getUserName(reading.userId)}>{getUserName(reading.userId)}</span>
                                            <span className="text-[10px] text-slate-400 truncate">Reportador</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onView(reading);
                                            }} 
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Ver detalle"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        {canDelete && (
                                            <button onClick={(e) => { e.stopPropagation(); onDelete(reading.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* BOTÓN SIGUIENTE */}
                    {hasMore && (
                        <div className="w-full md:min-w-[100px] md:w-auto flex items-center justify-center snap-start h-14 md:h-[280px]">
                            <button 
                                onClick={handleNext}
                                disabled={loading}
                                className="flex flex-row md:flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-600 transition-colors p-3 md:p-4 rounded-xl hover:bg-blue-50 h-full w-full border border-transparent hover:border-blue-100"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <ChevronRight size={24} className="md:w-8 md:h-8" />}
                                <span className="text-xs font-bold whitespace-nowrap">Ver más</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
             {/* Skeleton Loading Responsivo */}
             {loading && readings.length === 0 && (
                <div className="flex flex-col md:flex-row gap-4 overflow-hidden">
                    {[1,2,3].map(i => (
                        <div key={i} className="w-full md:min-w-[240px] h-32 md:h-[280px] bg-slate-50 rounded-lg animate-pulse border border-slate-100"></div>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- MAIN PAGE ---

const MeterReadingsPage: React.FC = () => {
  const { permissions, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal de Edición/Creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingReading, setEditingReading] = useState<Partial<MeterReading>>({});
  
  // Estado de carga de imagen
  const [isCompressing, setIsCompressing] = useState(false);
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
    getUsers().then(setUsers);
  }, []);

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Usuario desconocido';

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

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

  const handleViewReading = (reading: MeterReading) => {
    setEditingReading(JSON.parse(JSON.stringify(reading)));
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
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
        triggerRefresh();
    } catch (error) {
        console.error("Error al eliminar medidor:", error);
        setAlertState({isOpen: true, title: 'Error', message: 'No se pudo eliminar el registro.', type: 'error'});
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
            triggerRefresh();
        } catch (error) {
            console.error("Error al guardar medidor:", error);
            setAlertState({isOpen: true, title: 'Error', message: 'Error al guardar el registro.', type: 'error'});
        }
    } else if (!editingReading.photos || editingReading.photos.length === 0) {
        setAlertState({isOpen: true, title: 'Falta Foto', message: 'Debes subir al menos una foto del medidor.', type: 'error'});
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
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
                  const compressedDataUrl = await compressImage(files[i]);
                  processedPhotos.push({
                      name: files[i].name.replace(/\.[^/.]+$/, "") + ".jpg",
                      type: 'image/jpeg',
                      url: compressedDataUrl
                  });
              }
              setEditingReading(prev => ({ ...prev, photos: [...(prev.photos || []), ...processedPhotos] }));
          } catch (error) {
              setAlertState({ isOpen: true, title: 'Error', message: 'Error al procesar imagen.', type: 'error' });
          } finally {
              setIsCompressing(false);
          }
      }
  };

  const removePhoto = (index: number) => {
      setEditingReading(prev => ({...prev, photos: prev.photos?.filter((_, i) => i !== index)}));
  };

  const getLocations = () => ['Casa Grande', 'Casa Chica'];
  const getServicesForLocation = (location: string) => {
      if (location === 'Casa Grande') return ['Agua', 'Gas', 'Luz', 'Leña', 'Bencina Maquinas'];
      return ['Agua', 'Gas', 'Luz'];
  };

  return (
    <div className="space-y-6 w-full min-w-0">
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
                     <option value="Leña">Leña</option>
                     <option value="Bencina Maquinas">Bencina</option>
                 </select>
             </div>
            {canCreate && (
            <button onClick={handleNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm">
                <Plus size={18} /> <span className="hidden sm:inline">Nuevo Registro</span>
            </button>
            )}
        </div>
      </div>

      <div className="space-y-12">
            {getLocations().map(location => {
                const availableServices = getServicesForLocation(location);
                const servicesToShow = serviceFilter === 'Todos' 
                    ? availableServices 
                    : availableServices.filter(s => s === serviceFilter);

                if (servicesToShow.length === 0) return null;

                return (
                    <div key={location} className="animate-fade-in w-full min-w-0">
                        <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-300">
                            <MapPin className="text-slate-400" size={24} />
                            <h2 className="text-2xl font-bold text-slate-800">{location}</h2>
                        </div>

                        <div className="pl-0 md:pl-4 border-l-0 md:border-l-2 border-slate-100 w-full min-w-0">
                            {servicesToShow.map(service => (
                                <ServiceSection 
                                    key={`${location}-${service}`}
                                    location={location}
                                    service={service}
                                    users={users}
                                    refreshTrigger={refreshTrigger}
                                    canDelete={!!canDelete}
                                    onView={handleViewReading}
                                    onDelete={handleDeleteClick}
                                    onImageClick={(url) => setPreviewImage(url)}
                                    filterActive={serviceFilter !== 'Todos'}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar Registro?"
        message="¿Está seguro que desea eliminar este registro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
      />
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

      {/* Lightbox - Imagen Grande - Z Index alto para sobreponerse al modal si se abre desde ahí */}
      {previewImage && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
              <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"><X size={32} /></button>
              <img src={previewImage} alt="Vista Previa" className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
      )}

      {/* Modal Detalle/Edición */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-fade-in">
                  <div className="flex justify-between items-center p-6 border-b border-slate-100">
                      <h2 className="text-xl font-bold text-slate-800">{isViewMode ? 'Detalle Registro' : 'Nuevo Registro'}</h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                  </div>

                  <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                              <input type="date" required disabled={isViewMode} value={editingReading.date} onChange={e => setEditingReading({...editingReading, date: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"/>
                          </div>
                           <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Reportado Por</label>
                              <div className="w-full p-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-600 flex items-center gap-2">
                                  <UserIcon size={16} /><span className="text-sm truncate">{getUserName(editingReading.userId!)}</span>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Lugar</label>
                              <select required disabled={isViewMode} value={editingReading.location} onChange={e => {
                                      const newLoc = e.target.value as any;
                                      const validServices = getServicesForLocation(newLoc);
                                      let newService = editingReading.serviceType;
                                      if (!validServices.includes(newService as string)) newService = 'Agua';
                                      setEditingReading({...editingReading, location: newLoc, serviceType: newService});
                                  }} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500">
                                  <option value="Casa Grande">Casa Grande</option>
                                  <option value="Casa Chica">Casa Chica</option>
                              </select>
                          </div>
                           <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Servicio</label>
                              <select required disabled={isViewMode} value={editingReading.serviceType} onChange={e => setEditingReading({...editingReading, serviceType: e.target.value as any})} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500">
                                  {getServicesForLocation(editingReading.location || 'Casa Grande').map(srv => <option key={srv} value={srv}>{srv}</option>)}
                              </select>
                          </div>
                      </div>

                      <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Nota / Comentario</label>
                           <textarea
                               disabled={isViewMode}
                               value={editingReading.comments || ''}
                               onChange={e => setEditingReading({...editingReading, comments: e.target.value})}
                               className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 text-sm"
                               placeholder="Observaciones adicionales..."
                               rows={2}
                           />
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Fotografías</label>
                          {!isViewMode && (
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors mb-4 relative">
                                {isCompressing && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}
                                <input type="file" multiple accept="image/*" capture="environment" id="file-upload" className="hidden" onChange={handleFileUpload}/>
                                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                    <Upload className="text-slate-400" size={24} />
                                    <span className="text-blue-600 font-medium">Subir Foto o Tomar Cámara</span>
                                </label>
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-2">
                                {editingReading.photos?.map((photo, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                                        <img src={photo.url} alt="Evidencia" className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewImage(photo.url)}/>
                                        {!isViewMode && <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>}
                                    </div>
                                ))}
                          </div>
                      </div>
                  </form>

                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">{isViewMode ? 'Cerrar' : 'Cancelar'}</button>
                      {!isViewMode && <button type="button" onClick={(e) => handleSave(e as any)} disabled={isCompressing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">{isCompressing ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} Guardar</button>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default MeterReadingsPage;