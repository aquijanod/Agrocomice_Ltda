import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import RolesPage from './pages/Roles';
import PermissionsPage from './pages/Permissions';
import Attendance from './pages/Attendance';
import AttendanceUpload from './pages/AttendanceUpload';
import ActivitiesPage from './pages/Activities';
import AITools from './pages/AITools';
import { AuthProvider, useAuth } from './AuthContext';

// Wrapper to protect routes based on entity view permission
const ProtectedRoute = ({ 
  children, 
  entity
}: { 
  children?: React.ReactNode; 
  entity: string
}) => {
  const { permissions } = useAuth();

  if (!permissions) return <div className="p-4 text-center">Cargando permisos...</div>;
  
  if (!permissions[entity]?.view) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// Inner App component to use the Auth Hook
const AppRoutes: React.FC = () => {
  const { user, login } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={login} />} />
      
      <Route 
        path="/*" 
        element={
          user ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                
                {/* Protected Routes based on Permission Matrix */}
                <Route 
                  path="/users" 
                  element={
                    <ProtectedRoute entity="Usuarios">
                      <UsersPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/roles" 
                  element={
                    <ProtectedRoute entity="Roles">
                      <RolesPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/permissions" 
                  element={
                    <ProtectedRoute entity="Permisos">
                      <PermissionsPage />
                    </ProtectedRoute>
                  } 
                />
                {/* Operations Routes */}
                <Route 
                  path="/activities" 
                  element={
                    <ProtectedRoute entity="Actividades">
                      <ActivitiesPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/attendance/search" 
                  element={
                    <ProtectedRoute entity="Asistencia">
                      <Attendance />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/attendance/upload" 
                  element={
                    <ProtectedRoute entity="Asistencia">
                      <AttendanceUpload />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/ai-tools" 
                  element={
                    <ProtectedRoute entity="Herramientas IA">
                      <AITools />
                    </ProtectedRoute>
                  } 
                />
                
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
    </Routes>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;