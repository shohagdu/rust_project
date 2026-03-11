import axios from "axios";

let logoutFn: (() => void) | null = null;

export const setLogoutFunction = (fn: () => void): void => {
  logoutFn = fn;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_END_POINT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: Add interceptors (for auth token, refresh token, etc.)
api.interceptors.request.use(
  (config) => {
    // Example: attach token if available
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof logoutFn === "function"
    ) {
      logoutFn();
    }
    return Promise.reject(error);
  }
);

export default api;
