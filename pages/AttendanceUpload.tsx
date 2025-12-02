import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Save, X } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { bulkSaveAttendance } from '../services/dataService';
import { AttendanceRecord } from '../types';
import { useNavigate } from 'react-router-dom';

const AttendanceUpload: React.FC = () => {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  const canCreate = permissions?.['Asistencia']?.create;

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Por favor, sube un archivo CSV válido.');
      return;
    }
    setError(null);
    setFile(file);
    parseCSV(file);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      try {
        const rows = text.split('\n');
        const parsed: any[] = [];
        
        // Skip Header row if exists (assuming standard format)
        // Format: "id","usuario_id","nombre","departamento","fecha_hora",...
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].trim();
            if (!row) continue;
            
            // Basic regex to handle quoted CSV parts
            // Matches: "value", 123, "val,ue"
            const matches = row.match(/(?:\"([^\"]*)\")|([^,]+)/g);
            
            if (matches && matches.length >= 5) {
                // Cleanup quotes and get index values
                const clean = (val: string) => val ? val.replace(/^"|"$/g, '').trim() : '';
                
                // Index 1: usuario_id (numeric in CSV, string in App)
                const userId = clean(matches[1]); // Assuming 2nd column
                const name = clean(matches[2]);   // Assuming 3rd column
                const dateTime = clean(matches[4]); // Assuming 5th column "2025-08-22 15:28:59"
                
                if (userId && dateTime) {
                    parsed.push({ userId, name, dateTime });
                }
            }
        }
        setPreviewData(parsed);
      } catch (err) {
        setError('Error al procesar el archivo CSV. Verifique el formato.');
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!canCreate || previewData.length === 0) return;
    setLoading(true);

    try {
        // Convert raw preview data to unique Daily Attendance Records
        const recordsToSave: AttendanceRecord[] = [];
        const seen = new Set(); // To avoid duplicates in this batch

        previewData.forEach(item => {
            const dateOnly = item.dateTime.split(' ')[0]; // YYYY-MM-DD
            const key = `${item.userId}-${dateOnly}`;
            
            if (!seen.has(key)) {
                recordsToSave.push({
                    id: Math.random().toString(36).substr(2, 9),
                    userId: item.userId, // CSV ID matches App ID? (1->1)
                    date: dateOnly,
                    status: 'Presente',
                    notes: 'Importado desde CSV'
                });
                seen.add(key);
            }
        });

        await bulkSaveAttendance(recordsToSave);
        setLoading(false);
        alert('Datos cargados exitosamente');
        navigate('/attendance/search');
    } catch (e) {
        setError('Error al guardar datos.');
        setLoading(false);
    }
  };

  if (!canCreate) {
      return <div className="p-8 text-center text-slate-500">No tienes permisos para cargar datos.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
        <Upload className="text-blue-600" /> Carga Data Asistencia
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        {!file ? (
            <div 
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input 
                    type="file" 
                    id="csvUpload" 
                    accept=".csv"
                    className="hidden" 
                    onChange={handleChange}
                />
                <label htmlFor="csvUpload" className="cursor-pointer flex flex-col items-center">
                    <FileText size={48} className="text-slate-400 mb-4" />
                    <p className="text-lg font-medium text-slate-700">Arrastra tu archivo CSV aquí o <span className="text-blue-600 hover:underline">explora</span></p>
                    <p className="text-sm text-slate-400 mt-2">Formato esperado: id, usuario_id, nombre, departamento, fecha_hora...</p>
                </label>
            </div>
        ) : (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full text-green-600"><CheckCircle size={20}/></div>
                        <div>
                            <p className="font-bold text-slate-800">{file.name}</p>
                            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB • {previewData.length} registros detectados</p>
                        </div>
                    </div>
                    <button onClick={() => { setFile(null); setPreviewData([]); }} className="text-slate-400 hover:text-red-500">
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
                        <AlertCircle size={20} /> {error}
                    </div>
                )}

                {previewData.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                                <tr>
                                    <th className="p-3">ID Usuario</th>
                                    <th className="p-3">Nombre</th>
                                    <th className="p-3">Fecha/Hora</th>
                                    <th className="p-3">Estado Detectado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {previewData.slice(0, 50).map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-3">{row.userId}</td>
                                        <td className="p-3">{row.name}</td>
                                        <td className="p-3 font-mono">{row.dateTime}</td>
                                        <td className="p-3 text-green-600 font-medium">Presente</td>
                                    </tr>
                                ))}
                                {previewData.length > 50 && (
                                    <tr>
                                        <td colSpan={4} className="p-3 text-center text-slate-400 italic">
                                            ... y {previewData.length - 50} más
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button onClick={() => setFile(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        {loading ? 'Procesando...' : <><Save size={18} /> Guardar Asistencia</>}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceUpload;