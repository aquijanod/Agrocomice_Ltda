import React, { useState, useRef } from 'react';
import { Sparkles, MessageSquare, Image as ImageIcon, Video, Send, Loader2, MapPin, Search } from 'lucide-react';
import { sendChatMessage, generateImage, editImage, generateVideo } from '../services/geminiService';

type Tab = 'chat' | 'gen-image' | 'edit-image' | 'video';

const AITools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string, grounding?: any}[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Image Gen State
  const [genPrompt, setGenPrompt] = useState('');
  const [genSize, setGenSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [genResult, setGenResult] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  // Image Edit State
  const [editPrompt, setEditPrompt] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editResult, setEditResult] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Video Gen State
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  // --- Handlers ---

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const response = await sendChatMessage(userMsg, chatHistory);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.text || "No response text",
        grounding: response.groundingMetadata
      }]);
      setChatHistory(prev => [...prev, {role: 'user', parts:[{text: userMsg}]}, {role: 'model', parts:[{text: response.text}]}]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Error al conectar con Gemini." }]);
    } finally {
      setChatLoading(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGenImage = async () => {
    if (!genPrompt) return;
    setGenLoading(true);
    setGenResult(null);
    try {
      const res = await generateImage(genPrompt, genSize);
      setGenResult(res);
    } catch (e) {
      alert("Error generando imagen");
    } finally {
      setGenLoading(false);
    }
  };

  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEditImage = async () => {
    if (!editPrompt || !editPreview) return;
    setEditLoading(true);
    setEditResult(null);
    try {
      const base64Data = editPreview.split(',')[1];
      const res = await editImage(base64Data, editPrompt);
      setEditResult(res);
    } catch (e) {
      alert("Error editando imagen");
    } finally {
      setEditLoading(false);
    }
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setVideoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenVideo = async () => {
    if (!videoPrompt && !videoPreview) return;
    setVideoLoading(true);
    setVideoResult(null);
    try {
      const base64Data = videoPreview ? videoPreview.split(',')[1] : undefined;
      const res = await generateVideo(videoPrompt, base64Data);
      setVideoResult(res);
    } catch (e) {
      console.error(e);
      alert("Error generando video (Verifique si seleccionó su API Key de pago para Veo)");
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="text-yellow-500" /> IA Studio
          </h1>
           <p className="text-slate-500">Herramientas inteligentes impulsadas por Gemini y Veo</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
            <button onClick={() => setActiveTab('chat')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                <MessageSquare size={18} /> Asistente & Datos
            </button>
            <button onClick={() => setActiveTab('gen-image')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'gen-image' ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                <ImageIcon size={18} /> Crear Imagen (Pro)
            </button>
            <button onClick={() => setActiveTab('edit-image')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'edit-image' ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Sparkles size={18} /> Editar Imagen (Banana)
            </button>
            <button onClick={() => setActiveTab('video')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'video' ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Video size={18} /> Video (Veo)
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            
            {/* CHAT TAB */}
            {activeTab === 'chat' && (
                <div className="flex flex-col h-full max-w-4xl mx-auto">
                    <div className="flex-1 space-y-4 mb-4">
                        {messages.length === 0 && (
                            <div className="text-center text-slate-400 mt-20">
                                <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Pregunta sobre clima, plagas o busca ubicaciones cercanas.</p>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-4 rounded-xl ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white shadow-sm border border-slate-200 rounded-bl-none'}`}>
                                    <p className="whitespace-pre-wrap">{m.text}</p>
                                    {/* Grounding Sources */}
                                    {m.grounding?.groundingChunks && (
                                        <div className="mt-3 pt-3 border-t border-slate-100/20 text-xs">
                                            <p className="opacity-70 font-semibold mb-1 flex items-center gap-1"><Search size={10} /> Fuentes:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {m.grounding.groundingChunks.map((chunk: any, idx: number) => {
                                                    if(chunk.web) return <a key={idx} href={chunk.web.uri} target="_blank" className="underline opacity-80 hover:opacity-100 truncate max-w-[200px]">{chunk.web.title}</a>;
                                                    if(chunk.maps) return <span key={idx} className="flex items-center gap-1 opacity-80"><MapPin size={10}/> Mapa</span>
                                                    return null;
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                         {chatLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-4 rounded-xl rounded-bl-none shadow-sm flex items-center gap-2 text-slate-500">
                                    <Loader2 className="animate-spin" size={16} /> Pensando...
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef}></div>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                            placeholder="Ej: ¿Qué plaguicidas se recomiendan para peras?"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                        />
                        <button onClick={handleChat} disabled={chatLoading} className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* GEN IMAGE TAB */}
            {activeTab === 'gen-image' && (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Descripción de la Imagen</label>
                        <textarea 
                            className="w-full p-3 border border-slate-300 rounded-lg mb-4 h-24 focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="Un campo de perales al atardecer, alta resolución..."
                            value={genPrompt}
                            onChange={(e) => setGenPrompt(e.target.value)}
                        />
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium">Tamaño:</label>
                                <select 
                                    className="p-2 border rounded-md"
                                    value={genSize}
                                    onChange={(e) => setGenSize(e.target.value as any)}
                                >
                                    <option value="1K">1K</option>
                                    <option value="2K">2K</option>
                                    <option value="4K">4K</option>
                                </select>
                            </div>
                            <button 
                                onClick={handleGenImage} 
                                disabled={genLoading || !genPrompt}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {genLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} Generar
                            </button>
                        </div>
                    </div>
                    {genResult && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
                            <h3 className="text-sm font-bold mb-2 text-slate-500">Resultado:</h3>
                            <img src={genResult} alt="Generated" className="w-full rounded-lg" />
                        </div>
                    )}
                </div>
            )}

            {/* EDIT IMAGE TAB */}
            {activeTab === 'edit-image' && (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <label className="block text-sm font-bold text-slate-700 mb-2">1. Subir Imagen</label>
                            <input type="file" accept="image/*" onChange={handleEditFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                            {editPreview && <img src={editPreview} alt="Preview" className="mt-4 w-full h-48 object-cover rounded-lg" />}
                         </div>
                         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">2. Instrucción de Edición</label>
                                <textarea 
                                    className="w-full p-3 border border-slate-300 rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="Agrega un tractor rojo en el fondo..."
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleEditImage} 
                                disabled={editLoading || !editPrompt || !editPreview}
                                className="w-full bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                            >
                                {editLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} Editar
                            </button>
                         </div>
                    </div>
                     {editResult && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
                            <h3 className="text-sm font-bold mb-2 text-slate-500">Resultado:</h3>
                            <img src={editResult} alt="Edited" className="w-full rounded-lg" />
                        </div>
                    )}
                </div>
            )}

            {/* VIDEO TAB */}
             {activeTab === 'video' && (
                <div className="max-w-3xl mx-auto space-y-6">
                     <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800 flex gap-2">
                        <AlertCircle className="shrink-0 w-5 h-5" />
                        <p>Nota: Veo requiere una API Key de facturación seleccionada. Si se le solicita, seleccione su proyecto.</p>
                     </div>
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Prompt del Video</label>
                        <textarea 
                            className="w-full p-3 border border-slate-300 rounded-lg mb-4 h-24 focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="Un dron volando sobre un campo de maiz..."
                            value={videoPrompt}
                            onChange={(e) => setVideoPrompt(e.target.value)}
                        />
                         <label className="block text-sm font-bold text-slate-700 mb-2">Imagen de referencia (Opcional)</label>
                        <input type="file" accept="image/*" onChange={handleVideoFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 mb-4"/>
                        {videoPreview && <img src={videoPreview} alt="Ref" className="w-32 h-32 object-cover rounded-lg mb-4" />}

                         <button 
                            onClick={handleGenVideo} 
                            disabled={videoLoading || (!videoPrompt && !videoFile)}
                            className="w-full bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {videoLoading ? <Loader2 className="animate-spin" /> : <Video size={18} />} Generar Video (Veo)
                        </button>
                    </div>
                     {videoResult && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
                            <h3 className="text-sm font-bold mb-2 text-slate-500">Video Generado:</h3>
                            <video src={videoResult} controls className="w-full rounded-lg shadow-lg" />
                        </div>
                    )}
                </div>
             )}
        </div>
      </div>
    </div>
  );
};

// Simple Icon helper for the alert
const AlertCircle: React.FC<{className?:string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
)

export default AITools;
