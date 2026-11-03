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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwtRole(token: string): RolUsuario {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return 'CLIENTE';
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    const rawRole = (
      parsed.role ||
      parsed.rol ||
      parsed['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      ''
    ).toString().toUpperCase().trim();

    if (rawRole === 'ADMINISTRADOR' || rawRole === 'DUENO_RECINTO' || rawRole === 'CLIENTE') {
      return rawRole as RolUsuario;
    }
    return 'CLIENTE';
  } catch (err) {
    console.warn('[AuthContext] Error decodificando JWT:', err);
    return 'CLIENTE';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UsuarioSesion | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restaurar sesión de localStorage únicamente si existe usuario válido
    const token = api.getAccessToken();
    const storedUser = localStorage.getItem('promotora_user');
    if (storedUser) {
      try {
        const parsed: UsuarioSesion = JSON.parse(storedUser);
        if (parsed && parsed.email) {
          if (token) {
            const roleFromJwt = parseJwtRole(token);
            if (roleFromJwt) {
              parsed.rol = roleFromJwt;
            }
          }
          setUser(parsed);
          localStorage.setItem('promotora_user', JSON.stringify(parsed));

          // Sincronizar y actualizar con datos de perfil reales en background
          if (parsed.id && token) {
            api.getPerfil(parsed.id).then((perfil) => {
              if (perfil?.usuario) {
                const nombreCompleto = `${perfil.usuario.nombre || ''} ${perfil.usuario.apellido || ''}`.trim();
                const rolVerificado = (perfil.usuario.rol as RolUsuario) || parsed.rol;
                const sincronizado: UsuarioSesion = {
                  ...parsed,
                  nombre: nombreCompleto || parsed.nombre,
                  rol: rolVerificado,
                };
                setUser(sincronizado);
                localStorage.setItem('promotora_user', JSON.stringify(sincronizado));
              }
            }).catch(() => {});
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, pass);
      const rolFromToken = parseJwtRole(res.accessToken);

      let nombreUsuario = email.split('@')[0];
      let rolUsuario = rolFromToken;

      try {
        const perfil = await api.getPerfil(res.usuarioId);
        if (perfil && perfil.usuario) {
          const nombreCompleto = `${perfil.usuario.nombre || ''} ${perfil.usuario.apellido || ''}`.trim();
          if (nombreCompleto) nombreUsuario = nombreCompleto;
          if (perfil.usuario.rol) rolUsuario = perfil.usuario.rol as RolUsuario;
        }
      } catch {
        // En caso de fallo de red en perfil, conservamos rol decodificado del JWT
      }

      const sesion: UsuarioSesion = {
        id: res.usuarioId,
        nombre: nombreUsuario,
        email: email,
        rol: rolUsuario,
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
