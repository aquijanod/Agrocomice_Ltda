import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  Key, 
  CalendarDays, 
  LogOut, 
  Sparkles,
  Menu,
  X,
  Bell,
  Upload,
  Search
} from 'lucide-react';
import { useAuth } from '../AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, permissions, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Definición de grupos de navegación con mapeo a Entidades
  const navGroups = [
    {
      title: 'Resumen',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard, entity: null } // Public / Always visible
      ]
    },
    {
      title: 'Gestión de Acceso',
      items: [
        { label: 'Usuarios', path: '/users', icon: Users, entity: 'Usuarios' },
        { label: 'Roles', path: '/roles', icon: Shield, entity: 'Roles' },
        { label: 'Permisos', path: '/permissions', icon: Key, entity: 'Permisos' },
      ]
    },
    {
      title: 'Operaciones',
      items: [
        { label: 'Carga Data Asistencia', path: '/attendance/upload', icon: Upload, entity: 'Asistencia' },
        { label: 'Búsqueda Asistencia', path: '/attendance/search', icon: Search, entity: 'Asistencia' },
      ]
    },
    {
      title: 'Innovación',
      items: [
        { label: 'Herramientas IA', path: '/ai-tools', icon: Sparkles, entity: 'Herramientas IA' },
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* Sidebar Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:flex flex-col`}>
        {/* Logo Area */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-700 bg-slate-900">
          <div className="w-8 h-8 bg-blue-500 rounded-tl-xl rounded-br-xl flex items-center justify-center">
            <span className="text-xl">🍐</span>
          </div>
          <h1 className="font-bold text-lg tracking-tight">Agro Comice</h1>
          {/* Close button for mobile inside sidebar */}
          <button 
            className="md:hidden ml-auto text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
          {navGroups.map((group, groupIndex) => {
             // Filter items based on permissions
             const visibleItems = group.items.filter(item => {
                if (!item.entity) return true; // Always show items with no specific entity (like Dashboard)
                return permissions?.[item.entity]?.view === true;
             });

             if (visibleItems.length === 0) return null;

             return (
                <div key={groupIndex}>
                  <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isActive 
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <item.icon size={18} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
             );
          })}
        </nav>
        
        {/* Footer simple (sin usuario) */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          v1.0.0 &copy; 2024 Agro Comice
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
          
          {/* Mobile Toggle & Title */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-semibold text-slate-700 hidden sm:block">
              Bienvenido, {user?.name.split(' ')[0]}
            </h2>
          </div>

          {/* Right Side: User Profile & Actions */}
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            
            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.role}</p>
              </div>
              <img 
                src={user?.avatar || "https://picsum.photos/200"} 
                alt="User" 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" 
              />
              <button 
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-4 md:p-8 flex-1 overflow-y-auto bg-slate-50/50">
          <div className="w-full animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;