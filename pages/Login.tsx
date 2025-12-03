import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { authenticate } from '../services/dataService';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
        const user = await authenticate(email, password);
        
        if (user) {
            onLogin(user);
            navigate('/');
        } else {
            setError('Credenciales inválidas. Intente nuevamente.');
        }
    } catch (err) {
        console.error(err);
        setError('Error de conexión.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="p-8 bg-blue-950 text-center">
            <div className="w-16 h-16 bg-white rounded-tl-2xl rounded-br-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-4xl">🍐</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Agro Comice Ltda</h1>
            <p className="text-slate-300 mt-2">Portal de Gestión Interna</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Correo Electrónico</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all"
                placeholder="ejemplo@agrocomice.cl"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">
                    {error}
                </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-950 hover:bg-blue-900 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-slate-900/20 flex items-center justify-center"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-slate-500">
            ¿Olvidaste tu contraseña? <a href="#" className="text-blue-900 hover:underline">Contactar soporte</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;