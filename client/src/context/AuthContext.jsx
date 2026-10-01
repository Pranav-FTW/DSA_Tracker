import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(!!localStorage.getItem('dsa_token'));

  const logout = useCallback(() => {
    localStorage.removeItem('dsa_token');
    setUser(null);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('dsa_token')) return;
    api
      .get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem('dsa_token'))
      .finally(() => setBooting(false));
  }, []);

  const authenticate = (data) => {
    localStorage.setItem('dsa_token', data.token);
    setUser(data.user);
  };

  const login = async (identifier, password) => authenticate((await api.post('/auth/login', { identifier, password })).data);
  const register = async (username, email, password) =>
    authenticate((await api.post('/auth/register', { username, email, password })).data);

  return <AuthContext.Provider value={{ user, booting, login, register, logout }}>{children}</AuthContext.Provider>;
}
