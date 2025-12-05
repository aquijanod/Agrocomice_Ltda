import React from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;
}

interface ConfirmProps extends ModalProps {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmProps> = ({ 
    isOpen, onClose, onConfirm, title, message, 
    confirmText = "Confirmar", cancelText = "Cancelar", isDestructive = true 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
        <div className="p-6">
          <div className="flex items-start gap-4">
             <div className={`p-3 rounded-full shrink-0 ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                <AlertTriangle size={24} />
             </div>
             <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{message}</div>
             </div>
          </div>
        </div>
        <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-100">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            className={`px-4 py-2 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 ${
                isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AlertModal: React.FC<ModalProps & { type?: 'success' | 'error' | 'info' }> = ({ 
    isOpen, onClose, title, message, type = 'info' 
}) => {
  if (!isOpen) return null;
  
  const colors = {
    success: 'text-green-600 bg-green-100',
    error: 'text-red-600 bg-red-100',
    info: 'text-blue-600 bg-blue-100'
  };
  
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertTriangle : Info;

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[110] backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
             <div className={`p-3 rounded-full shrink-0 ${colors[type]}`}>
                <Icon size={24} />
             </div>
             <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{message}</div>
             </div>
          </div>
        </div>
        <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-100">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium transition-colors shadow-lg"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};