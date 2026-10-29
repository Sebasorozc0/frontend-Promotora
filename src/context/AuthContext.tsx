import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { RolUsuario, UsuarioSesion } from '../types/api';

interface AuthContextType {
  user: UsuarioSesion | null;
  isAuthenticated: boolean;
  debeCambiarPassword: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  registro: (datos: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    telefono?: string;
    dpi?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  cambiarPassword: (actual: string, nueva: string) => Promise<void>;
  setSimulatedRole: (rol: RolUsuario) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UsuarioSesion | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restaurar sesión de localStorage si existe
    const token = api.getAccessToken();
    const storedUser = localStorage.getItem('promotora_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // Fallback
      }
    } else {
      // Sesión de demostración inicial por defecto (CLIENTE)
      const demoUser: UsuarioSesion = {
        id: 7,
        nombre: 'Carlos Mendoza',
        email: 'carlos.mendoza@ejemplo.com',
        rol: 'CLIENTE',
        debeCambiarPassword: false,
      };
      setUser(demoUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, pass);
      const sesion: UsuarioSesion = {
        id: res.usuarioId,
        nombre: res.nombre || email.split('@')[0],
        email: res.email || email,
        rol: res.rol,
        debeCambiarPassword: res.debeCambiarPassword,
      };
      setUser(sesion);
      localStorage.setItem('promotora_user', JSON.stringify(sesion));
    } finally {
      setIsLoading(false);
    }
  };

  const registro = async (datos: any) => {
    setIsLoading(true);
    try {
      await api.registro(datos);
      await login(datos.email, datos.password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    localStorage.removeItem('promotora_user');
  };

  const cambiarPassword = async (actual: string, nueva: string) => {
    if (!user) return;
    await api.cambiarPassword(actual, nueva, user.id);
    const updated = { ...user, debeCambiarPassword: false };
    setUser(updated);
    localStorage.setItem('promotora_user', JSON.stringify(updated));
  };

  const setSimulatedRole = (rol: RolUsuario) => {
    if (!user) return;
    const updated: UsuarioSesion = {
      ...user,
      rol,
      nombre: rol === 'ADMINISTRADOR' ? 'Admin Promotora' : rol === 'DUENO_RECINTO' ? 'Dueño Cayalá' : 'Carlos Mendoza',
    };
    setUser(updated);
    localStorage.setItem('promotora_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        debeCambiarPassword: user?.debeCambiarPassword || false,
        isLoading,
        login,
        registro,
        logout,
        cambiarPassword,
        setSimulatedRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
