import axios from 'axios';

// Создаем инстанс axios с базовыми настройками
export const api = axios.create({
  baseURL: process.env.REACT_APP_DOMAIN_REGISTRATION,
  withCredentials: true,
});

// Интерцептор запросов
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор ответов
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Получаем текущий URL для редиректа обратно после авторизации
      const currentPath = window.location.href;
      const redirectUrl = error.response.data?.redirect_url || 
                         `/auth?redirect_uri=${encodeURIComponent(currentPath)}`;
      
      // Очищаем токены
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('expires_at');
      localStorage.removeItem('session_id');
      
      // Редиректим на страницу авторизации
      window.location.href = redirectUrl;
    }
    return Promise.reject(error);
  }
);

// Функции API для аутентификации
export const loginUser = async (email, password, realm = 'default') => {
  return api.post(`/api/v1/${realm}/auth/login`, { email, password });
};

export const registerUser = async (email, password) => {
  return api.post('/api/v1/registration', { email, password });
};

export const getOAuthUrl = async (provider, state, redirectUri) => {
  return api.get(`/api/v1/${provider}/link`, {
    params: { state, redirect_uri: redirectUri }
  });
};

export const handleOAuthAuthentication = async (code, state, cid, realm, provider) => {
  const endpoint = `/api/v1/${realm}/${provider}/authentication`;
  return api.post(endpoint, {
    code,
    state,
    ...(provider === "yandex" && cid && { session_id: cid }),
  });
};