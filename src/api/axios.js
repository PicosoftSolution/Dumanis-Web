import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register');

    // Session expired -> go to login. Skip for the login call itself,
    // otherwise a wrong password would reload the page and hide the error.
    if (status === 401 && !isAuthCall) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Assign users to a project. Shows "Already Exists" alert on 409.
export const assignUsersToProject = async (projectId, userIds) => {
  try {
    const res = await api.post(`/projects/${projectId}/assign-users`, { userIds });
    return res.data;
  } catch (err) {
    if (err.response?.status === 409) {
      const emails = (err.response.data.alreadyAssigned || []).map((u) => u.email).join(', ');
      alert(`Already Exists${emails ? ': ' + emails : ''}`);
    } else {
      alert(err.response?.data?.message || 'Something went wrong');
    }
    throw err;
  }
};

export default api;