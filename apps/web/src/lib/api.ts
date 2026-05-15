import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

let refreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('web_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  r => r,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (refreshing) {
        return new Promise(resolve => {
          queue.push(token => { original.headers.Authorization = `Bearer ${token}`; resolve(api(original)); });
        });
      }
      original._retry = true;
      refreshing = true;
      try {
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true });
        const token = data.data.accessToken;
        localStorage.setItem('web_token', token);
        queue.forEach(cb => cb(token));
        queue = [];
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        localStorage.removeItem('web_token');
        queue = [];
      } finally { refreshing = false; }
    }
    return Promise.reject(error);
  }
);
