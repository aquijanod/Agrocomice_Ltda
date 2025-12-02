import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PermissionMatrix } from './types';
import { resolveUserPermissions } from './services/dataService';

interface AuthContextType {
  user: User | null;
  permissions: PermissionMatrix | null;
  login: (user: User) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<PermissionMatrix | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (userData: User) => {
    setLoading(true);
    setUser(userData);
    const perms = await resolveUserPermissions(userData.role);
    setPermissions(perms);
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    setPermissions(null);
  };

  return (
    <AuthContext.Provider value={{ user, permissions, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};