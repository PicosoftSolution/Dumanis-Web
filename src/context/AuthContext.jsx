import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';


export const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data.data);
    } catch (error) {
      console.error('Fetch user error:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { token, data } = response.data;
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(data);
    return response.data;
  };

  const register = async (userData) => {
    // Public registration only ever creates a Super Admin account, and it
    // does NOT log the person in — it sends a verification email instead.
    const response = await axios.post(`${API_URL}/auth/register-super-admin`, userData);
    return response.data;
  };

  const checkVerificationToken = async (token) => {
    const response = await axios.get(`${API_URL}/auth/verify-email/${token}`);
    return response.data;
  };

  const verifyEmail = async (token, password) => {
    const response = await axios.post(`${API_URL}/auth/verify-email`, { token, password });
    const { token: jwt, data } = response.data;
    localStorage.setItem('token', jwt);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
    setUser(data);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, checkVerificationToken, verifyEmail, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};