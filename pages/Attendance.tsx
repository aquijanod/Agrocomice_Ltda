import React, { useState, useEffect, useRef } from 'react';
import { User, AttendanceRecord, AttendanceLog } from '../types';
import { getUsers, getAttendanceByRange, getAttendanceLogs } from '../services/dataService';
import { ChevronLeft, ChevronRight, Search, Calendar, MapPin, Tablet, Printer, Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const Attendance: React.FC = () => {
  const { permissions } = useAuth();
  
  // Search State
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Data State
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Calendar View State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // PDF Report Ref
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUsers().then(data => {
      setUsers(data);
      // Default to Alfonso (ID 1) as he has most data in the sample
      const defaultUser = data.find(u => u.id === '1') || data[0];
      if (defaultUser) setSelectedUser(defaultUser.id);
      
      // Default Dates: August 2025 (matching the sample data)
      const today = new Date();
      // Use sample data range if today is not in 2025, otherwise current month
      const isSamplePeriod = true; 
      
      if (isSamplePeriod) {
          setStartDate('2025-08-01');
          setEndDate('2025-08-31');
          setCurrentCalendarDate(new Date(2025, 7, 1)); // Month is 0-indexed (7=Aug)
      } else {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          setStartDate(firstDay.toISOString().split('T')[0]);
          setEndDate(lastDay.toISOString().split('T')[0]);
      }
    });
  }, []);

  // Fetch logs when a day is selected
  useEffect(() => {
    if (selectedDay && selectedUser) {
        const dateStr = selectedDay.toISOString().split('T')[0];
        getAttendanceLogs(selectedUser, dateStr).then(setLogs);
    } else {
        setLogs([]);
    }
  }, [selectedDay, selectedUser]);

  const handleSearch = async () => {
    if (!selectedUser || !startDate || !endDate) {
        alert("Por favor seleccione usuario y rango de fechas");
        return;
    }
    
    setLoading(true);
    setHasSearched(true);
    // Reset selection to clear previous detail view
    setSelectedDay(null); 
    
    // Sync calendar view to start date
    const startObj = new Date(startDate);
    // Fix timezone offset issue for calendar navigation
    const startObjUTC = new Date(startObj.getUTCFullYear(), startObj.getUTCMonth(), 1);
    setCurrentCalendarDate(startObjUTC);

    try {
        const data = await getAttendanceByRange(selectedUser, startDate, endDate);
        setRecords(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const daysInMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay(); 
  
  // Fix: Calendar uses Sunday as 0. Our header is Dom, Lun... so we use standard getDay()
  const startDay = firstDayOfMonth; 

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
    setSelectedDay(newDate);
  };

  const changeMonth = (delta: number) => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + delta, 1));
    setSelectedDay(null);
  };

  const getRecordForDay = (day: number) => {
    const dateStr = `${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Check if record exists in the fetched data
    return records.find(r => r.date === dateStr);
  };

  const selectedDateStr = selectedDay ? selectedDay.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const selectedISODate = selectedDay ? selectedDay.toISOString().split('T')[0] : '';
  const currentRecord = records.find(r => r.date === selectedISODate);

  // --- Logic for navigation restriction ---
  // Normalize dates to the first of the month for comparison
  const getMonthTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  
  const currentMonthTime = getMonthTime(currentCalendarDate);
  const startMonthTime = startDate ? getMonthTime(new Date(startDate)) : -Infinity;
  const endMonthTime = endDate ? getMonthTime(new Date(endDate)) : Infinity;

  const canGoBack = currentMonthTime > startMonthTime;
  const canGoForward = currentMonthTime < endMonthTime;

  // Helper for Print View
  const getSelectedUserInfo = () => users.find(u => u.id === selectedUser);

  // Generate PDF Handler
  const handlePrint = async () => {
    if (!reportRef.current) return;
    
    try {
        setGeneratingPdf(true);
        
        // Wait a bit to ensure rendering
        await new Promise(resolve => setTimeout(resolve, 200));

        // Get elements
        const headerPart = document.getElementById('report-part-1');
        const tablePart = document.getElementById('report-part-2');

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 297;
        
        // Render Header & Info (Part 1)
        let currentY = 0;
        if (headerPart) {
            const canvas1 = await html2canvas(headerPart, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            // Full width image
            const imgH1 = (canvas1.height * pageWidth) / canvas1.width;
            
            pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgH1);
            currentY = imgH1; 
        }

        // Render Table (Part 2)
        if (tablePart && selectedDay) {
            const canvas2 = await html2canvas(tablePart, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            // Align widths by using full page width (padding handled by CSS)
            const imgH2 = (canvas2.height * pageWidth) / canvas2.width;
            
            // Check if it fits on the current page
            const spaceLeft = pageHeight - currentY;
            
            if (imgH2 > spaceLeft) {
                // Not enough space? Add new page and reset Y
                pdf.addPage();
                currentY = 0;
            }
            
            pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, currentY, pageWidth, imgH2);
        }

        const userName = getSelectedUserInfo()?.name.replace(/\s+/g, '_') || 'Reporte';
        pdf.save(`Asistencia_${userName}_${currentCalendarDate.getMonth()+1}_${currentCalendarDate.getFullYear()}.pdf`);
        
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Hubo un error al generar el PDF. Por favor intente nuevamente.");
    } finally {
        setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {/* SCREEN VIEW HEADER & FILTERS */}
      <div className="space-y-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                <Search className="text-blue-600" /> Búsqueda Asistencia
            </h1>
            <p className="text-slate-500 mt-1">Consulta y gestiona los registros históricos de asistencia del personal.</p>
        </div>
        
        {/* FILTER BAR */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Usuario</label>
                <select 
                    value={selectedUser} 
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-700 font-medium"
                >
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
            </div>
            
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Fecha Inicio</label>
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-700"
                />
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Fecha Término</label>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-700"
                />
            </div>

            <div>
                <button 
                    onClick={handleSearch}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {loading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> : <Search size={18} />}
                    Buscar
                </button>
            </div>
        </div>
      </div>

      {!hasSearched && (
        <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
            <Search size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg">Seleccione filtros y presione "Buscar" para ver la asistencia.</p>
        </div>
      )}

      {hasSearched && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            
            {/* LEFT COLUMN: COMPACT CALENDAR */}
            <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Calendar Header */}
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                        <button 
                            onClick={() => changeMonth(-1)} 
                            disabled={!canGoBack}
                            className="p-1 hover:bg-white rounded-md transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:shadow-none"
                        >
                            <ChevronLeft size={20} className="text-slate-500"/>
                        </button>
                        <h2 className="text-lg font-bold text-slate-800 capitalize">
                            {currentCalendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button 
                            onClick={() => changeMonth(1)} 
                            disabled={!canGoForward}
                            className="p-1 hover:bg-white rounded-md transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:shadow-none"
                        >
                            <ChevronRight size={20} className="text-slate-500"/>
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="p-4">
                        <div className="grid grid-cols-7 mb-2">
                            {['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].map(day => (
                            <div key={day} className="text-center text-xs font-bold text-blue-600 uppercase py-1">
                                {day}
                            </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: startDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square"></div>
                            ))}
                            
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const record = getRecordForDay(day);
                            const isSelected = selectedDay && selectedDay.getDate() === day && selectedDay.getMonth() === currentCalendarDate.getMonth();
                            
                            // Blue box logic for Presente
                            const isPresent = record?.status === 'Presente';
                            
                            return (
                                <button
                                    key={day}
                                    onClick={() => handleDayClick(day)}
                                    disabled={loading}
                                    className={`
                                        aspect-square rounded flex items-start justify-end p-1 text-xs font-medium transition-all relative border
                                        ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1 z-10' : 'border-transparent'}
                                        ${isPresent 
                                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                            : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-100'}
                                    `}
                                >
                                    <span>{day}</span>
                                    {record?.status === 'Ausente' && <span className="absolute bottom-1 left-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>}
                                    {record?.status === 'Licencia' && <span className="absolute bottom-1 left-1 w-1.5 h-1.5 bg-orange-500 rounded-full"></span>}
                                </button>
                            );
                            })}
                        </div>
                    </div>
                </div>
                
                {/* Legend */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-600 rounded"></div> Asistencia</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white border border-slate-200 rounded relative"><span className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span></div> Ausente</div>
                </div>
            </div>

            {/* RIGHT COLUMN: DETAILS TABLE */}
            <div className="lg:col-span-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span className="text-2xl">👷</span> Detalle de Asistencia
                            </h3>
                            <p className="text-slate-500 font-medium mt-1">
                                {selectedDay ? `Fecha: ${selectedDateStr}` : 'Seleccione un día en el calendario'}
                            </p>
                        </div>
                        
                        {/* Generate PDF Button */}
                        <button 
                            type="button"
                            onClick={handlePrint}
                            disabled={generatingPdf}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                        >
                            {generatingPdf ? (
                                <><Loader2 size={16} className="animate-spin" /> Generando PDF...</>
                            ) : (
                                <><Printer size={16} /> Descargar Reporte (PDF)</>
                            )}
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-x-auto">
                        {selectedDay ? (
                            logs.length > 0 ? (
                                <>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                                                <th className="p-3 rounded-tl-lg">Nombre</th>
                                                <th className="p-3">Departamento</th>
                                                <th className="p-3">Fecha y Hora</th>
                                                <th className="p-3 rounded-tr-lg">Dispositivo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {logs.map((log, idx) => (
                                                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                                                    <td className="p-3 font-medium text-slate-800">{log.userName}</td>
                                                    <td className="p-3 text-slate-600 flex items-center gap-1"><MapPin size={14} className="text-slate-400"/> {log.department}</td>
                                                    <td className="p-3 text-slate-600 font-mono">{log.dateTime}</td>
                                                    <td className="p-3 text-slate-600 flex items-center gap-1"><Tablet size={14} className="text-slate-400"/> {log.deviceId}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
                                    <Calendar size={48} className="mb-4 opacity-20" />
                                    <p className="font-medium">No hay registros de asistencia para este día.</p>
                                    <p className="text-sm opacity-70 mt-2">
                                        {currentRecord?.status === 'Ausente' ? 'El trabajador estuvo ausente.' : 'Sin datos.'}
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
                                <p>Seleccione un día del calendario para ver el detalle.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
      )}

      {/* --- HIDDEN PDF REPORT TEMPLATE --- */}
      {/* 
         This div is rendered off-screen but is used by html2canvas to generate the PDF image.
         We set a fixed width of 800px which maps well to A4 PDF generation.
      */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <div ref={reportRef} className="w-[800px] bg-white text-slate-900">
            
            {/* PART 1: HEADER & INFO */}
            <div id="report-part-1">
                {/* Corporate Header */}
                <div className="bg-blue-950 text-white p-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Corrected Icon Alignment - Matches Login */}
                        <div className="w-16 h-16 bg-white rounded-tl-2xl rounded-br-2xl flex items-center justify-center shadow-lg shrink-0">
                            <span className="text-4xl">🍐</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Agro Comice Ltda</h1>
                            <p className="text-blue-200 text-sm mt-1 uppercase tracking-wider font-medium">Gestión de Personal</p>
                        </div>
                    </div>
                    <div className="text-right">
                         <div className="bg-blue-900/50 px-4 py-2 rounded-lg border border-blue-800">
                            <p className="text-[10px] text-blue-300 uppercase tracking-wider font-bold mb-0.5">Reporte Generado</p>
                            <p className="font-mono font-bold text-lg">{new Date().toLocaleDateString('es-ES')}</p>
                         </div>
                    </div>
                </div>

                <div className="p-10">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-4">
                        <h2 className="text-xl font-bold text-slate-800">Reporte de Asistencia</h2>
                    </div>

                    {/* User Info & Filter Context */}
                    {selectedUser && (
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg mb-8 grid grid-cols-2 gap-8 shadow-sm">
                            <div>
                                <h3 className="text-xs font-bold uppercase text-slate-500 mb-2 tracking-wide">Trabajador</h3>
                                <p className="text-2xl font-bold text-slate-900">{getSelectedUserInfo()?.name}</p>
                                <p className="text-base text-slate-600 mt-1">{getSelectedUserInfo()?.role}</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold uppercase text-slate-500 mb-2 tracking-wide">Periodo Visualizado</h3>
                                <p className="text-2xl font-bold text-slate-900 capitalize">{currentCalendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
                                <p className="text-base text-slate-600 mt-1">Rango: {startDate} al {endDate}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* PART 2: DETAIL TABLE */}
            {selectedDay && logs.length > 0 && (
                <div id="report-part-2" className="p-10 pt-0">
                     <h3 className="font-bold text-xl mb-6 text-slate-800 border-l-4 border-blue-600 pl-4">
                         Detalle del Día: {selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}
                     </h3>
                     <table className="w-full text-left border border-slate-300 rounded-sm">
                         <thead>
                             <tr className="bg-slate-100 border-b border-slate-300">
                                 <th className="p-4 text-sm font-bold text-slate-700 uppercase">Nombre</th>
                                 <th className="p-4 text-sm font-bold text-slate-700 uppercase">Departamento</th>
                                 <th className="p-4 text-sm font-bold text-slate-700 uppercase">Fecha y Hora</th>
                                 <th className="p-4 text-sm font-bold text-slate-700 uppercase">Dispositivo</th>
                             </tr>
                         </thead>
                         <tbody>
                             {logs.map((log, i) => (
                                 <tr key={i} className="border-b border-slate-200">
                                     <td className="p-4 text-sm font-bold text-slate-800">{log.userName}</td>
                                     <td className="p-4 text-sm text-slate-700">{log.department}</td>
                                     <td className="p-4 text-sm font-mono text-slate-700">{log.dateTime}</td>
                                     <td className="p-4 text-sm text-slate-700">{log.deviceId}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                     
                    <div className="mt-8 pt-8 border-t border-slate-300 text-center text-xs text-slate-400">
                        <p>Generado automáticamente por Sistema Agro Comice Ltda.</p>
                        <p className="mt-1">Documento de uso interno.</p>
                    </div>
                </div>
            )}
            
            {/* Fallback if no logs for footer in Part 1 if Part 2 is missing */}
            {(!selectedDay || logs.length === 0) && (
                <div className="p-10 pt-0">
                     <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500 text-sm italic mb-8">
                        * No se ha seleccionado un día específico con registros para el detalle.
                    </div>
                    <div className="pt-8 border-t border-slate-300 text-center text-xs text-slate-400">
                        <p>Generado automáticamente por Sistema Agro Comice Ltda.</p>
                    </div>
                </div>
            )}

          </div>
      </div>
    </div>
  );
};

export default Attendance;