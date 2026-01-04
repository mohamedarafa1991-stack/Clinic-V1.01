import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getUsers } from '../services/db';

interface AuthContextType {
  user: User | null;
  login: (e: string, p: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, login: () => false, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('medicore_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const login = (email: string, pass: string) => {
    const found = getUsers().find(u => u.email === email && u.password === pass);
    if (found) {
      setUser(found);
      sessionStorage.setItem('medicore_user', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const logout = () => { setUser(null); sessionStorage.removeItem('medicore_user'); };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};