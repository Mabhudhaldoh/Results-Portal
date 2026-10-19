import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'headmaster' | 'finance';
  firstName: string;
  lastName: string;
  photo?: string;
  admissionNumber?: string;
  employeeNumber?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginStudent: (admissionNumber: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(res => { setUser(res.data.user); setLoading(false); })
        .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setToken(null); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (!res.data || res.data.success === false) throw { response: { data: res.data } };
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const loginStudent = async (admissionNumber: string, password: string) => {
    const res = await api.post('/auth/login', { admissionNumber, password });
    if (!res.data || res.data.success === false) throw { response: { data: res.data } };
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (u: User) => setUser(u);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginStudent, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
