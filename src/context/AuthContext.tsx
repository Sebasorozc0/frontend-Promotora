import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { api } from '../api/client';
import { RolUsuario, UsuarioSesion } from '../types/api';

function role(token: string): RolUsuario | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
    const value = claims.role || claims.rol || claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    return ['CLIENTE','ADMINISTRADOR','DUENO_RECINTO','VALIDADOR_BOLETOS'].includes(value) ? value : null;
  } catch { return null; }
}
function initial(): UsuarioSesion | null {
  try {
    const token = api.getAccessToken(); const stored = localStorage.getItem('promotora_user');
    if (!token || !stored) return null;
    const user = JSON.parse(stored); const rol = role(token);
    return Number.isInteger(user.id) && user.email && rol ? { ...user, rol } : null;
  } catch { return null; }
}
interface Registro { nombre: string; apellido: string; email: string; password: string; telefono?: string; }
interface AuthContextType {
  user: UsuarioSesion | null; isAuthenticated: boolean; debeCambiarPassword: boolean; isLoading: boolean;
  login: (email: string, password: string) => Promise<void>; registro: (datos: Registro) => Promise<void>;
  logout: () => Promise<void>; cambiarPassword: (actual: string, nueva: string) => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioSesion | null>(initial);
  const [isLoading, setLoading] = useState(false);
  const generation = useRef(0);
  const guardar = (next: UsuarioSesion | null) => { setUser(next); if (next) localStorage.setItem('promotora_user', JSON.stringify(next)); else localStorage.removeItem('promotora_user'); };
  useEffect(() => {
    const expired = () => { generation.current++; guardar(null); };
    window.addEventListener('promotora:session-expired', expired);
    return () => window.removeEventListener('promotora:session-expired', expired);
  }, []);
  useEffect(() => {
    if (!user || user.debeCambiarPassword || user.rol === 'VALIDADOR_BOLETOS') return;
    let active = true; const epoch = generation.current;
    api.getPerfil(user.id).then(perfil => {
      if (active && epoch === generation.current && api.getAccessToken()) guardar({ ...user, nombre: [perfil.usuario.nombre, perfil.usuario.apellido].filter(Boolean).join(' '), email: perfil.usuario.email, rol: perfil.usuario.rol, debeCambiarPassword: perfil.usuario.debeCambiarPassword });
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);
  const login = async (email: string, password: string) => {
    setLoading(true); const epoch = ++generation.current;
    try {
      const result = await api.login(email, password); const rol = role(result.accessToken);
      if (!rol) { api.setTokens(null, null); throw { detail: 'El servidor devolvió una sesión con rol desconocido.' }; }
      if (epoch !== generation.current) return;
      guardar({ id: result.usuarioId, nombre: email, email, rol, debeCambiarPassword: result.debeCambiarPassword });
    } finally { setLoading(false); }
  };
  const registro = async (datos: Registro) => { await api.registro(datos); await login(datos.email, datos.password); };
  const logout = async () => { generation.current++; guardar(null); await api.logout(); };
  const cambiarPassword = async (actual: string, nueva: string) => {
    if (!user) return;
    await api.cambiarPassword(actual, nueva, user.id); await logout();
  };
  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, debeCambiarPassword: !!user?.debeCambiarPassword, isLoading, login, registro, logout, cambiarPassword }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth requiere AuthProvider'); return value; }
